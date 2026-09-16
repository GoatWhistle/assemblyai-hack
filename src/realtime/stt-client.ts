import { type CloseExplanation, explainClose, isAlertWorthy } from "./close-codes"
import type { SttBegin, SttMessage, SttTermination, SttTurn } from "./protocol"
import { mintToken, STT_TOKEN_ROUTE, sttSocketUrl } from "./tokens"
import { type Transport, type TransportFactory, webSocketTransport } from "./transport"

export const TERMINATION_TIMEOUT_MS = 4000

export type SttClientEvents = {
  onBegin?: (message: SttBegin) => void
  onTurn?: (message: SttTurn) => void
  onTermination?: (message: SttTermination) => void
  onClose?: (explanation: CloseExplanation) => void
  onError?: (error: unknown) => void
  onTokenMinted?: (attempt: number) => void
}

export type SttClientOptions = {
  readonly tokenRoute?: string
  readonly transport?: TransportFactory
  readonly query?: Record<string, string>
  readonly events?: SttClientEvents
}

export class SttClient {
  private transport: Transport | null = null
  private terminationWaiters: (() => void)[] = []
  private terminated = false
  private mintCount = 0
  private readonly events: SttClientEvents
  private readonly factory: TransportFactory
  private readonly tokenRoute: string
  private readonly query: Record<string, string>

  constructor(options: SttClientOptions = {}) {
    this.events = options.events ?? {}
    this.factory = options.transport ?? webSocketTransport
    this.tokenRoute = options.tokenRoute ?? STT_TOKEN_ROUTE
    this.query = options.query ?? {}
  }

  get isOpen(): boolean {
    return this.transport?.isOpen === true
  }

  get tokensMinted(): number {
    return this.mintCount
  }

  async connect(): Promise<void> {
    const token = await mintToken(this.tokenRoute)
    this.mintCount += 1
    this.events.onTokenMinted?.(this.mintCount)
    this.terminated = false
    await new Promise<void>((resolve, reject) => {
      let settled = false
      this.transport = this.factory(sttSocketUrl(token, this.query), {
        onOpen: () => {
          if (!settled) {
            settled = true
            resolve()
          }
        },
        onMessage: (data) => this.handle(data),
        onClose: (code, reason) => {
          const explanation = explainClose(code, reason)
          if (isAlertWorthy(code)) {
            console.warn(`stt socket close ${code}: ${explanation.operatorAction}`)
          }
          this.events.onClose?.(explanation)
          this.releaseWaiters()
          this.transport = null
          if (!settled) {
            settled = true
            reject(new Error(`the stt socket closed before opening: ${code}`))
          }
        },
        onError: (error) => {
          this.events.onError?.(error)
          if (!settled) {
            settled = true
            reject(error instanceof Error ? error : new Error("stt socket error"))
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

  sendAudio(bytes: Uint8Array): void {
    this.transport?.send(bytes)
  }

  keepAlive(): void {
    this.transport?.send(JSON.stringify({ type: "KeepAlive" }))
  }

  forceEndpoint(): void {
    this.transport?.send(JSON.stringify({ type: "ForceEndpoint" }))
  }

  updateConfiguration(patch: Record<string, unknown>): void {
    this.transport?.send(JSON.stringify({ type: "UpdateConfiguration", ...patch }))
  }

  async end(): Promise<void> {
    if (this.transport === null) {
      return
    }
    this.transport.send(JSON.stringify({ type: "Terminate" }))
    await this.waitForTermination()
    this.transport?.close(1000, "terminated")
    this.transport = null
  }

  private waitForTermination(): Promise<void> {
    if (this.terminated) {
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        console.warn("stt termination was not confirmed within the timeout; closing anyway")
        resolve()
      }, TERMINATION_TIMEOUT_MS)
      this.terminationWaiters.push(() => {
        clearTimeout(timer)
        resolve()
      })
    })
  }

  private releaseWaiters(): void {
    const waiters = this.terminationWaiters
    this.terminationWaiters = []
    for (const waiter of waiters) {
      waiter()
    }
  }

  private handle(data: string | ArrayBuffer): void {
    if (typeof data !== "string") {
      return
    }
    let message: SttMessage
    try {
      message = JSON.parse(data) as SttMessage
    } catch (error) {
      this.events.onError?.(error)
      return
    }
    if (message.type === "Begin") {
      this.events.onBegin?.(message)
      return
    }
    if (message.type === "Turn") {
      this.events.onTurn?.(message)
      return
    }
    if (message.type === "Termination") {
      this.terminated = true
      this.events.onTermination?.(message)
      this.releaseWaiters()
    }
  }
}
