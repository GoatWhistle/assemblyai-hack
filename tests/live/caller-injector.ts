import type { Responder } from "./responder"

export type LineStep = {
  readonly line: string
  readonly trigger: "reply-done" | "reply-started"
  readonly whenAgentSaid?: string
  readonly delayMs: number
}

export type AgentEvent = {
  readonly type: string
  readonly text?: string
  readonly status?: string
}

export type DueLine = {
  readonly line: string
  readonly delayMs: number
  readonly step: number
  readonly answered?: boolean
}

export type LineScheduler = {
  readonly next: (event: AgentEvent) => DueLine | null
  readonly done: () => boolean
  readonly position: () => number
  readonly callerSpoke: () => void
}

export type InjectorConfig = {
  readonly agentHost: string
  readonly steps: readonly LineStep[]
  readonly responder?: Responder
  readonly lines: Readonly<Record<string, string>>
}

export type InjectorLog = {
  readonly played: { line: string; step: number; atMs: number; durationMs: number }[]
  readonly events: { type: string; atMs: number; status?: string; text?: string }[]
  readonly errors: string[]
  finished: boolean
}

export function createLineScheduler(
  steps: readonly LineStep[],
  responder?: Responder,
): LineScheduler {
  let index = 0
  let agentSaid = ""
  let carried = ""
  let answered = 0
  const test = (pattern: string, text: string) => new RegExp(pattern, "i").test(text)
  function lastQuestion(text: string, ask: string): string {
    const questions = text
      .split(/(?<=[.?!])\s+/)
      .filter((part) => part.trim().endsWith("?") || test(ask, part))
    return questions[questions.length - 1] ?? text
  }
  function answer(said: string): string | null {
    if (responder === undefined || said.length === 0 || answered >= responder.maxLines) {
      return null
    }
    const question = lastQuestion(said, responder.ask)
    const always = responder.rules.find(
      (rule) => rule.evenOnReadBack === true && test(rule.whenAgentAsks, said),
    )
    if (always !== undefined) {
      return always.line
    }
    const asks = test(responder.ask, question)
    if (!(question.includes("?") || asks) || (test(responder.readBack, question) && !asks)) {
      return responder.fallback
    }
    const rule =
      responder.rules.find((r) => test(r.whenAgentAsks, question)) ??
      (asks ? responder.rules.find((r) => test(r.whenAgentAsks, said)) : undefined)
    return rule?.line ?? responder.fallback
  }
  function matches(step: LineStep): boolean {
    return step.whenAgentSaid === undefined || test(step.whenAgentSaid, agentSaid)
  }
  function take(step: LineStep): DueLine {
    const due = { line: step.line, delayMs: step.delayMs, step: index }
    index += 1
    return due
  }
  function afterReply(step: LineStep | undefined): DueLine | null {
    if (step !== undefined && step.trigger === "reply-done" && matches(step)) {
      return take(step)
    }
    if (agentSaid.length > 0) {
      carried = agentSaid
    }
    const line = answer(carried)
    if (line === null || responder === undefined) {
      return null
    }
    answered += 1
    return { line, delayMs: responder.delayMs, step: -1, answered: true }
  }
  return {
    next(event: AgentEvent): DueLine | null {
      const step = steps[index]
      if (event.type === "reply.started") {
        agentSaid = ""
        return step !== undefined && step.trigger === "reply-started" ? take(step) : null
      }
      if (event.type === "transcript.agent") {
        agentSaid = `${agentSaid} ${event.text ?? ""}`.trim()
        return null
      }
      return event.type === "reply.done" ? afterReply(step) : null
    },
    done(): boolean {
      return index >= steps.length
    },
    position(): number {
      return index
    },
    callerSpoke(): void {
      carried = ""
    },
  }
}

export function installCallerInjector(config: InjectorConfig): void {
  const scope = window as unknown as { readbackCallerInjector?: InjectorLog }
  const scheduler = createLineScheduler(config.steps, config.responder)
  let pendingAnswer: ReturnType<typeof setTimeout> | null = null
  const log: InjectorLog = { played: [], events: [], errors: [], finished: false }
  scope.readbackCallerInjector = log
  let context: AudioContext | null = null
  let destination: MediaStreamAudioDestinationNode | null = null

  function sink(): { context: AudioContext; destination: MediaStreamAudioDestinationNode } {
    if (context === null || destination === null) {
      context = new AudioContext()
      destination = context.createMediaStreamDestination()
    }
    void context.resume()
    return { context, destination }
  }

  function bytesOf(base64: string): ArrayBuffer {
    const raw = atob(base64)
    const out = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i += 1) {
      out[i] = raw.charCodeAt(i)
    }
    return out.buffer
  }

  function play(line: string, step: number): void {
    const audio = config.lines[line]
    if (audio === undefined) {
      log.errors.push(`no audio was supplied for line ${line}`)
      return
    }
    const { context: ctx, destination: out } = sink()
    ctx
      .decodeAudioData(bytesOf(audio))
      .then((buffer) => {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(out)
        source.start()
        log.played.push({
          line,
          step,
          atMs: performance.now(),
          durationMs: buffer.duration * 1000,
        })
        log.finished = scheduler.done()
      })
      .catch((error: unknown) => {
        log.errors.push(`line ${line} could not be decoded: ${String(error)}`)
      })
  }

  const media = navigator.mediaDevices
  media.getUserMedia = async () => sink().destination.stream

  function eventOf(data: unknown): InjectorLog["events"][number] | null {
    if (typeof data !== "string") {
      return null
    }
    let parsed: { type?: unknown; text?: unknown; status?: unknown }
    try {
      parsed = JSON.parse(data) as typeof parsed
    } catch {
      return null
    }
    const type = typeof parsed.type === "string" ? parsed.type : ""
    if (type === "" || type === "audio" || type === "reply.audio") {
      return null
    }
    return {
      type,
      atMs: performance.now(),
      ...(typeof parsed.status === "string" ? { status: parsed.status } : {}),
      ...(typeof parsed.text === "string" ? { text: parsed.text } : {}),
    }
  }

  function heard(message: MessageEvent): void {
    const event = eventOf(message.data)
    if (event === null) {
      return
    }
    log.events.push(event)
    if (event.type === "reply.started" && pendingAnswer !== null) {
      clearTimeout(pendingAnswer)
      pendingAnswer = null
    }
    const due = scheduler.next(event)
    if (due === null) {
      return
    }
    const timer = setTimeout(() => {
      if (due.answered === true) {
        pendingAnswer = null
      }
      scheduler.callerSpoke()
      play(due.line, due.step)
    }, due.delayMs)
    if (due.answered === true) {
      pendingAnswer = timer
    }
  }

  const Native = window.WebSocket
  class WatchedSocket extends Native {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols)
      if (String(url).includes(config.agentHost)) {
        this.addEventListener("message", heard)
      }
    }
  }
  window.WebSocket = WatchedSocket
}

export function injectorScript(config: InjectorConfig): string {
  return [
    createLineScheduler.toString(),
    installCallerInjector.toString(),
    `installCallerInjector(${JSON.stringify(config)});`,
  ].join("\n")
}
