import type { SessionBinding } from "@/domain"
import { type AgentDispatchEvents, buildSessionUpdate, dispatchRaw } from "./agent-dispatch"
import { type CloseExplanation, explainClose, isAlertWorthy } from "./close-codes"
import { guardAgentInput, guardAgentSession } from "./param-guard"
import { AGENT_TOKEN_ROUTE, agentSocketUrl, mintAgentToken } from "./tokens"
import { type Transport, type TransportFactory, webSocketTransport } from "./transport"

const SESSION_END_TIMEOUT_MS = 4000

export type AgentSessionConfig = {
  readonly agentId?: string
  readonly systemPrompt?: string
  readonly greeting?: string
  readonly keyterms?: readonly string[]
  readonly turnDetection?: {
    readonly vadThreshold?: number
    readonly interruptResponse?: boolean
  }
}

export type AgentClientEvents = Omit<AgentDispatchEvents, "onSessionEnded"> & {
  onClose?: (explanation: CloseExplanation, expected: boolean) => void
  onTokenMinted?: (attempt: number) => void
  onBound?: (binding: SessionBinding) => void
}

export type AgentClientOptions = {
  readonly tokenRoute?: string
  readonly transport?: TransportFactory
  readonly events?: AgentClientEvents
  readonly session?: AgentSessionConfig
}

export class AgentClient {
  private transport: Transport | null = null
  private endWaiters: (() => void)[] = []
  private ended = false
  private closeRequested = false
  private mintCount = 0
  private bound: SessionBinding | null = null
  private readonly events: AgentClientEvents
  private readonly factory: TransportFactory
  private readonly tokenRoute: string
  private readonly session: AgentSessionConfig

  constructor(options: AgentClientOptions = {}) {
    this.events = options.events ?? {}
    this.factory = options.transport ?? webSocketTransport
    this.tokenRoute = options.tokenRoute ?? AGENT_TOKEN_ROUTE
    this.session = options.session ?? {}
  }

  async connect(): Promise<void> {
    guardAgentSession(buildSessionUpdate(this.session))
    const grant = await mintAgentToken(this.tokenRoute, this.bound?.sessionId ?? null)
    this.mintCount += 1
    this.events.onTokenMinted?.(this.mintCount)
    if (this.bound === null) {
      this.bound = grant.binding
      this.events.onBound?.(grant.binding)
    }
    this.ended = false
    this.closeRequested = false
    const session = this.sessionFor(grant.binding)
    guardAgentSession(session)
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const opened: Transport = this.factory(agentSocketUrl(grant.token), {
        onOpen: () => {
          opened.send(JSON.stringify({ type: "session.update", session }))
          if (!settled) {
            settled = true
            resolve()
          }
        },
        onMessage: (data) => {
          if (typeof data === "string" && this.transport === opened) {
            dispatchRaw(data, this.dispatchEvents())
          }
        },
        onClose: (code, reason) => {
          if (this.transport !== null && this.transport !== opened) {
            return
          }
          const explanation = explainClose(code, reason)
          if (isAlertWorthy(code)) {
            console.warn(`agent socket close ${code}: ${explanation.operatorAction}`)
          }
          const expected = code === 1000 || this.closeRequested || this.ended
          this.transport = null
          this.events.onClose?.(explanation, expected)
          this.releaseWaiters()
          if (!settled) {
            settled = true
            reject(new Error(`the agent socket closed before opening: ${code}`))
          }
        },
        onError: (error) => {
          this.events.onError?.(error)
          if (!settled) {
            settled = true
            reject(error instanceof Error ? error : new Error("agent socket error"))
          }
        },
      })
      this.transport = opened
    })
  }

  async reconnect(): Promise<void> {
    const previous = this.transport
    this.transport = null
    previous?.close(1000, "reconnecting")
    await this.connect()
  }

  sendAudio(samples: Int16Array, encode: (bytes: Uint8Array) => string): void {
    const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)
    this.transport?.send(JSON.stringify({ type: "input.audio", audio: encode(bytes) }))
  }

  updateTurnDetection(patch: Record<string, unknown>): void {
    guardAgentInput(patch)
    this.transport?.send(
      JSON.stringify({ type: "session.update", session: { input: { ...patch } } }),
    )
  }

  async end(): Promise<void> {
    if (this.transport === null) {
      return
    }
    this.closeRequested = true
    this.transport.send(JSON.stringify({ type: "session.end" }))
    await this.waitForEnded()
    this.transport?.close(1000, "session ended")
    this.transport = null
  }

  private sessionFor(binding: SessionBinding): Record<string, unknown> {
    if (this.session.agentId !== undefined || binding.agentId.length === 0) {
      return buildSessionUpdate(this.session)
    }
    return buildSessionUpdate({ ...this.session, agentId: binding.agentId })
  }

  private dispatchEvents(): AgentDispatchEvents {
    return {
      ...this.events,
      onSessionEnded: () => {
        this.ended = true
        this.releaseWaiters()
      },
    }
  }

  private waitForEnded(): Promise<void> {
    if (this.ended) {
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        console.warn("session.ended was not received within the timeout; closing anyway")
        resolve()
      }, SESSION_END_TIMEOUT_MS)
      this.endWaiters.push(() => {
        clearTimeout(timer)
        resolve()
      })
    })
  }

  private releaseWaiters(): void {
    const waiters = this.endWaiters
    this.endWaiters = []
    for (const waiter of waiters) {
      waiter()
    }
  }
}
