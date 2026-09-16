export type TransportListeners = {
  onOpen: () => void
  onMessage: (data: string | ArrayBuffer) => void
  onClose: (code: number, reason: string) => void
  onError: (error: unknown) => void
}

export type Transport = {
  send: (data: string | ArrayBuffer | Uint8Array) => void
  close: (code?: number, reason?: string) => void
  readonly isOpen: boolean
}

export type TransportFactory = (url: string, listeners: TransportListeners) => Transport

export const webSocketTransport: TransportFactory = (url, listeners) => {
  const socket = new WebSocket(url)
  socket.binaryType = "arraybuffer"
  socket.onopen = () => listeners.onOpen()
  socket.onmessage = (event: MessageEvent) => {
    const data = event.data
    if (typeof data === "string" || data instanceof ArrayBuffer) {
      listeners.onMessage(data)
    }
  }
  socket.onclose = (event: CloseEvent) => listeners.onClose(event.code, event.reason)
  socket.onerror = (event: Event) => listeners.onError(event)
  return {
    get isOpen() {
      return socket.readyState === WebSocket.OPEN
    },
    send: (data) => {
      if (socket.readyState !== WebSocket.OPEN) {
        return
      }
      if (typeof data === "string") {
        socket.send(data)
        return
      }
      socket.send(data instanceof Uint8Array ? (data.slice().buffer as ArrayBuffer) : data)
    },
    close: (code, reason) => {
      if (socket.readyState === WebSocket.CLOSED) {
        return
      }
      socket.close(code, reason)
    },
  }
}

export class MemoryTransport implements Transport {
  readonly sent: (string | ArrayBuffer | Uint8Array)[] = []
  private open = true
  private closedWith: { code: number; reason: string } | null = null

  constructor(private readonly listeners: TransportListeners) {}

  get isOpen(): boolean {
    return this.open
  }

  get closeInfo(): { code: number; reason: string } | null {
    return this.closedWith
  }

  acceptOpen(): void {
    this.listeners.onOpen()
  }

  deliver(data: string | ArrayBuffer): void {
    this.listeners.onMessage(data)
  }

  deliverJson(value: unknown): void {
    this.listeners.onMessage(JSON.stringify(value))
  }

  fail(error: unknown): void {
    this.listeners.onError(error)
  }

  send(data: string | ArrayBuffer | Uint8Array): void {
    if (!this.open) {
      return
    }
    this.sent.push(data)
  }

  close(code = 1000, reason = ""): void {
    if (!this.open) {
      return
    }
    this.open = false
    this.closedWith = { code, reason }
    this.listeners.onClose(code, reason)
  }

  sentJson(): Record<string, unknown>[] {
    return this.sent
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => JSON.parse(entry) as Record<string, unknown>)
  }

  sentBinaryCount(): number {
    return this.sent.filter((entry) => typeof entry !== "string").length
  }
}
