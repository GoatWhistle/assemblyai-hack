import { type CloseExplanation, explainClose, isAlertWorthy } from "./close-codes"
import { guardSttQuery, guardSttUpdate } from "./param-guard"
import type { SttBegin, SttMessage, SttTermination, SttTurn } from "./protocol"
import { checkBeginModel } from "./stt-model"
import { mintToken, STT_TOKEN_ROUTE, sttQueryParams, sttSocketUrl } from "./tokens"
import {
  SocketOpenError,
  type Transport,
  type TransportFactory,
  webSocketTransport,
} from "./transport"

const TERMINATION_TIMEOUT_MS = 4000

export type SttClientEvents = {
  onBegin?: (message: SttBegin) => void
  onTurn?: (message: SttTurn) => void
  onTermination?: (message: SttTermination) => void
  onClose?: (explanation: CloseExplanation, expected: boolean) => void
  onError?: (error: unknown) => void
  onTokenMinted?: (attempt: number) => void
  onModelMismatch?: (model: string) => void
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
  private closeRequested = false
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

  async connect(): Promise<void> {
    guardSttQuery(sttQueryParams("", this.query))
    const token = await mintToken(this.tokenRoute)
    this.mintCount += 1
    this.events.onTokenMinted?.(this.mintCount)
    this.terminated = false
    this.closeRequested = false
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const opened: Transport = this.factory(sttSocketUrl(token, this.query), {
        onOpen: () => {
          if (!settled) {
            settled = true
            resolve()
          }
        },
        onMessage: (data) => {
          if (this.transport === opened) {
            this.handle(data)
          }
        },
        onClose: (code, reason) => {
          if (this.transport !== null && this.transport !== opened) {
            return
          }
          const explanation = explainClose(code, reason)
          if (isAlertWorthy(code)) {
            console.warn(`stt socket close ${code}: ${explanation.operatorAction}`)
          }
          const expected = code === 1000 || this.closeRequested || this.terminated
          this.transport = null
          this.events.onClose?.(explanation, expected)
          this.releaseWaiters()
          if (!settled) {
            settled = true
            reject(new SocketOpenError("stt", code))
          }
        },
        onError: (error) => {
          this.events.onError?.(error)
          if (!settled) {
            settled = true
            reject(new SocketOpenError("stt", null))
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
    const message = { type: "UpdateConfiguration", ...patch }
    guardSttUpdate(message)
    this.transport?.send(JSON.stringify(message))
  }

  async end(): Promise<void> {
    if (this.transport === null) {
      return
    }
    this.closeRequested = true
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

  private acceptBegin(message: SttBegin): void {
    const check = checkBeginModel(message)
    this.events.onBegin?.(message)
    if (check.kind !== "mismatch") {
      return
    }
    this.closeRequested = true
    this.events.onModelMismatch?.(check.model)
    const current = this.transport
    this.transport = null
    current?.close(1000, "unexpected speech model")
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
      this.acceptBegin(message)
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
