import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AgentClient } from "@/realtime/agent-client"
import { MemoryTransport, type TransportFactory } from "@/realtime/transport"

let sockets: MemoryTransport[] = []
let urls: string[] = []

const factory: TransportFactory = (url, listeners) => {
  const transport = new MemoryTransport(listeners)
  sockets.push(transport)
  urls.push(url)
  queueMicrotask(() => transport.acceptOpen())
  return transport
}

beforeEach(() => {
  sockets = []
  urls = []
  let counter = 0
  globalThis.fetch = vi.fn(async () => {
    counter += 1
    return new Response(JSON.stringify({ token: `agent-token-${counter}` }), { status: 200 })
  }) as unknown as typeof fetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("AgentClient session", () => {
  it("opens the agent socket with a minted token and sends session.update first", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    expect(urls[0]).toContain("wss://agents.assemblyai.com/v1/ws")
    expect(urls[0]).toContain("token=agent-token-1")
    const first = sockets[0]?.sentJson()[0]
    expect(first?.type).toBe("session.update")
  })

  it("declares pcm on both directions, which is 24 kHz for this socket", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    const update = sockets[0]?.sentJson()[0] as {
      session: {
        input: { format: { encoding: string } }
        output?: { format: { encoding: string } }
      }
    }
    expect(update.session.input.format.encoding).toBe("audio/pcm")
    expect(update.session.output?.format.encoding).toBe("audio/pcm")
  })

  it("mints a fresh token on reconnect", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    await client.reconnect()
    expect(client.tokensMinted).toBe(2)
    expect(urls[1]).toContain("token=agent-token-2")
  })

  it("keeps min_silence strictly below max_silence when turn detection is configured", async () => {
    const client = new AgentClient({
      transport: factory,
      session: { turnDetection: { minSilence: 500, maxSilence: 2000, vadThreshold: 0.6 } },
    })
    await client.connect()
    const update = sockets[0]?.sentJson()[0] as {
      session: { input: { turn_detection: { min_silence: number; max_silence: number } } }
    }
    const detection = update.session.input.turn_detection
    expect(detection.min_silence).toBeLessThan(detection.max_silence)
  })
})

describe("AgentClient exit path", () => {
  it("sends session.end and waits for session.ended before closing the socket", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    const socket = sockets[0]
    const ending = client.end()
    await Promise.resolve()
    expect(socket?.sentJson().at(-1)).toEqual({ type: "session.end" })
    expect(socket?.isOpen).toBe(true)
    socket?.deliverJson({ type: "session.ended" })
    await ending
    expect(socket?.isOpen).toBe(false)
  })

  it("closes anyway after the timeout rather than leaving a billable socket open", async () => {
    vi.useFakeTimers()
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const client = new AgentClient({ transport: factory })
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
})

describe("AgentClient messages", () => {
  it("drives the half-duplex window from reply.started and reply.done", async () => {
    const order: string[] = []
    const client = new AgentClient({
      transport: factory,
      events: {
        onReplyStarted: () => order.push("started"),
        onReplyDone: () => order.push("done"),
      },
    })
    await client.connect()
    sockets[0]?.deliverJson({ type: "reply.started" })
    sockets[0]?.deliverJson({ type: "reply.done" })
    expect(order).toEqual(["started", "done"])
  })

  it("reports the agent's own transcript so a phantom turn can be matched against it", async () => {
    const lines: string[] = []
    const client = new AgentClient({
      transport: factory,
      events: { onAgentTranscript: (text) => lines.push(text) },
    })
    await client.connect()
    sockets[0]?.deliverJson({ type: "transcript.agent", text: "Confirming quantity: 30." })
    expect(lines).toEqual(["Confirming quantity: 30."])
  })

  it("accepts reply audio under either the documented data field or the audio field", async () => {
    const chunks: string[] = []
    const client = new AgentClient({
      transport: factory,
      events: { onReplyAudio: (base64) => chunks.push(base64) },
    })
    await client.connect()
    sockets[0]?.deliverJson({ type: "audio", audio: "AAAA" })
    sockets[0]?.deliverJson({ type: "reply.audio", data: "BBBB" })
    expect(chunks).toEqual(["AAAA", "BBBB"])
  })

  it("sends audio as base64 inside an input.audio json message, never as a binary frame", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    client.sendAudio(new Int16Array([1, 2, 3]), () => "ZW5jb2RlZA==")
    const last = sockets[0]?.sentJson().at(-1)
    expect(last).toEqual({ type: "input.audio", audio: "ZW5jb2RlZA==" })
    expect(sockets[0]?.sentBinaryCount()).toBe(0)
  })

  it("records the session id so a resume has something to resume with", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    sockets[0]?.deliverJson({ type: "session.created", session_id: "sess-9" })
    expect(client.currentSessionId).toBe("sess-9")
  })

  it("implements no tool queue, because tools are server-side http webhooks", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    const before = sockets[0]?.sentJson().length ?? 0
    sockets[0]?.deliverJson({
      type: "tool.call",
      call_id: "call-1",
      name: "propose_field",
      arguments: {},
    })
    sockets[0]?.deliverJson({ type: "reply.done" })
    const sent = sockets[0]?.sentJson().slice(before) ?? []
    expect(sent.some((entry) => entry.type === "tool.result")).toBe(false)
  })

  it("surfaces an error frame with its code", async () => {
    const seen: string[] = []
    const client = new AgentClient({
      transport: factory,
      events: { onAgentError: (code) => seen.push(code) },
    })
    await client.connect()
    sockets[0]?.deliverJson({ type: "error", error: { code: "at_capacity", message: "busy" } })
    expect(seen).toEqual(["at_capacity"])
  })
})
