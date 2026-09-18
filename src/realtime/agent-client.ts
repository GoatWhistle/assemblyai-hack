import { type AgentDispatchEvents, buildSessionUpdate, dispatchRaw } from "./agent-dispatch"
import { type CloseExplanation, explainClose, isAlertWorthy } from "./close-codes"
import { AGENT_TOKEN_ROUTE, agentSocketUrl, mintToken } from "./tokens"
import { type Transport, type TransportFactory, webSocketTransport } from "./transport"

const SESSION_END_TIMEOUT_MS = 4000

export type AgentSessionConfig = {
  readonly agentId?: string
  readonly systemPrompt?: string
  readonly greeting?: string
  readonly keyterms?: readonly string[]
  readonly turnDetection?: {
    readonly vadThreshold?: number
    readonly minSilence?: number
    readonly maxSilence?: number
    readonly interruptResponse?: boolean
  }
}

export type AgentClientEvents = Omit<AgentDispatchEvents, "onSessionEnded"> & {
  onClose?: (explanation: CloseExplanation) => void
  onTokenMinted?: (attempt: number) => void
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
  private mintCount = 0
  private sessionId: string | null = null
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

  get isOpen(): boolean {
    return this.transport?.isOpen === true
  }

  get tokensMinted(): number {
    return this.mintCount
  }

  get currentSessionId(): string | null {
    return this.sessionId
  }

  async connect(): Promise<void> {
    const token = await mintToken(this.tokenRoute)
    this.mintCount += 1
    this.events.onTokenMinted?.(this.mintCount)
    this.ended = false
    await new Promise<void>((resolve, reject) => {
      let settled = false
      this.transport = this.factory(agentSocketUrl(token), {
        onOpen: () => {
          this.transport?.send(
            JSON.stringify({
              type: "session.update",
              session: buildSessionUpdate(this.session),
            }),
          )
          if (!settled) {
            settled = true
            resolve()
          }
        },
        onMessage: (data) => {
          if (typeof data === "string") {
            dispatchRaw(data, this.dispatchEvents())
          }
        },
        onClose: (code, reason) => {
          const explanation = explainClose(code, reason)
          if (isAlertWorthy(code)) {
            console.warn(`agent socket close ${code}: ${explanation.operatorAction}`)
          }
          this.events.onClose?.(explanation)
          this.releaseWaiters()
          this.transport = null
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
    })
  }

  async reconnect(): Promise<void> {
    this.transport?.close(1000, "reconnecting")
    this.transport = null
    await this.connect()
  }

  sendAudio(samples: Int16Array, encode: (bytes: Uint8Array) => string): void {
    const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)
    this.transport?.send(JSON.stringify({ type: "input.audio", audio: encode(bytes) }))
  }

  updateTurnDetection(patch: Record<string, unknown>): void {
    this.transport?.send(
      JSON.stringify({ type: "session.update", session: { input: { ...patch } } }),
    )
  }

  requestReply(instructions?: string): void {
    this.transport?.send(
      JSON.stringify({
        type: "reply.create",
        ...(instructions === undefined ? {} : { instructions }),
      }),
    )
  }

  async end(): Promise<void> {
    if (this.transport === null) {
      return
    }
    this.transport.send(JSON.stringify({ type: "session.end" }))
    await this.waitForEnded()
    this.transport?.close(1000, "session ended")
    this.transport = null
  }

  private dispatchEvents(): AgentDispatchEvents {
    return {
      ...this.events,
      onReady: (sessionId) => {
        this.sessionId = sessionId
        this.events.onReady?.(sessionId)
      },
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
