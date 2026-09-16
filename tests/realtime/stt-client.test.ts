import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SttClient } from "@/realtime/stt-client"
import { MemoryTransport, type TransportFactory } from "@/realtime/transport"

let sockets: MemoryTransport[] = []
let minted: string[] = []

const factory: TransportFactory = (url, listeners) => {
  const transport = new MemoryTransport(listeners)
  sockets.push(transport)
  minted.push(url)
  queueMicrotask(() => transport.acceptOpen())
  return transport
}

function stubTokenRoute() {
  let counter = 0
  globalThis.fetch = vi.fn(async () => {
    counter += 1
    return new Response(JSON.stringify({ token: `token-${counter}` }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }) as unknown as typeof fetch
}

beforeEach(() => {
  sockets = []
  minted = []
  stubTokenRoute()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("SttClient tokens", () => {
  it("mints a token before opening and carries it in the query string", async () => {
    const client = new SttClient({ transport: factory })
    await client.connect()
    expect(client.tokensMinted).toBe(1)
    expect(minted[0]).toContain("token=token-1")
    expect(minted[0]).toContain("wss://streaming.assemblyai.com/v3/ws")
  })

  it("pins the model that is not retired and the 16 kHz pcm encoding", async () => {
    const client = new SttClient({ transport: factory })
    await client.connect()
    expect(minted[0]).toContain("speech_model=universal-3-5-pro")
    expect(minted[0]).toContain("sample_rate=16000")
    expect(minted[0]).toContain("encoding=pcm_s16le")
    expect(minted[0]).not.toContain("universal-3-pro&")
  })

  it("never sends the two async parameters that started returning 400", async () => {
    const client = new SttClient({ transport: factory })
    await client.connect()
    expect(minted[0]).not.toContain("summarization")
    expect(minted[0]).not.toContain("auto_chapters")
  })

  it("mints a fresh token on every reconnect, because a token is single-use", async () => {
    const client = new SttClient({ transport: factory })
    await client.connect()
    await client.reconnect()
    await client.reconnect()
    expect(client.tokensMinted).toBe(3)
    expect(minted[0]).toContain("token=token-1")
    expect(minted[1]).toContain("token=token-2")
    expect(minted[2]).toContain("token=token-3")
    expect(new Set(minted).size).toBe(3)
  })

  it("surfaces a token route failure rather than opening a socket with nothing", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("no key configured", { status: 500 }),
    ) as unknown as typeof fetch
    const client = new SttClient({ transport: factory })
    await expect(client.connect()).rejects.toThrow(/500/)
    expect(sockets.length).toBe(0)
  })
})

describe("SttClient exit path", () => {
  it("sends Terminate and waits for the Termination frame before closing", async () => {
    const client = new SttClient({ transport: factory })
    await client.connect()
    const socket = sockets[0]
    expect(socket).toBeDefined()
    const ending = client.end()
    await Promise.resolve()
    expect(socket?.sentJson().at(-1)).toEqual({ type: "Terminate" })
    expect(socket?.isOpen).toBe(true)
    socket?.deliverJson({
      type: "Termination",
      audio_duration_seconds: 12,
      session_duration_seconds: 13,
    })
    await ending
    expect(socket?.isOpen).toBe(false)
  })

  it("closes anyway when the confirmation never arrives, rather than leaking the socket", async () => {
    vi.useFakeTimers()
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const client = new SttClient({ transport: factory })
    const connecting = client.connect()
    await vi.advanceTimersByTimeAsync(0)
    await connecting
    const ending = client.end()
    await vi.advanceTimersByTimeAsync(5000)
    await ending
    expect(sockets[0]?.isOpen).toBe(false)
    expect(warn).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it("is safe to end twice", async () => {
    const client = new SttClient({ transport: factory })
    await client.connect()
    const ending = client.end()
    sockets[0]?.deliverJson({
      type: "Termination",
      audio_duration_seconds: 1,
      session_duration_seconds: 1,
    })
    await ending
    await expect(client.end()).resolves.toBeUndefined()
  })
})

describe("SttClient messages", () => {
  it("routes Begin and Turn frames to their handlers", async () => {
    const turns: string[] = []
    let begun: string | null = null
    const client = new SttClient({
      transport: factory,
      events: {
        onBegin: (message) => {
          begun = message.id
        },
        onTurn: (message) => turns.push(message.transcript),
      },
    })
    await client.connect()
    sockets[0]?.deliverJson({ type: "Begin", id: "abc", expires_at: 1 })
    sockets[0]?.deliverJson({
      type: "Turn",
      turn_order: 0,
      turn_is_formatted: true,
      end_of_turn: true,
      transcript: "Bisoprolol ten milligrams",
      end_of_turn_confidence: 0.99,
      words: [],
    })
    expect(begun).toBe("abc")
    expect(turns).toEqual(["Bisoprolol ten milligrams"])
  })

  it("sends audio as a binary frame, never as base64 json", async () => {
    const client = new SttClient({ transport: factory })
    await client.connect()
    client.sendAudio(new Uint8Array([1, 2, 3, 4]))
    expect(sockets[0]?.sentBinaryCount()).toBe(1)
    expect(sockets[0]?.sentJson()).toEqual([])
  })

  it("keeps the socket alive with KeepAlive while half-duplex holds the audio back", async () => {
    const client = new SttClient({ transport: factory })
    await client.connect()
    client.keepAlive()
    expect(sockets[0]?.sentJson()).toEqual([{ type: "KeepAlive" }])
  })
})
