import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SttClient } from "@/realtime/stt-client"
import { checkBeginModel, EXPECTED_STT_MODEL } from "@/realtime/stt-model"
import { MemoryTransport, type TransportFactory } from "@/realtime/transport"

let sockets: MemoryTransport[] = []

const factory: TransportFactory = (_url, listeners) => {
  const transport = new MemoryTransport(listeners)
  sockets.push(transport)
  queueMicrotask(() => transport.acceptOpen())
  return transport
}

beforeEach(() => {
  sockets = []
  globalThis.fetch = vi.fn(
    async () => new Response(JSON.stringify({ token: "stt-token" }), { status: 200 }),
  ) as unknown as typeof fetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

function begin(configuration?: Record<string, unknown>) {
  return {
    type: "Begin",
    id: "stt-session",
    expires_at: 0,
    ...(configuration === undefined ? {} : { configuration }),
  }
}

describe("the model the recognizer actually started is checked, not assumed from the request", () => {
  it("records the pinned model and keeps the socket open when Begin reports it", async () => {
    const mismatches: string[] = []
    const models: (string | null)[] = []
    const client = new SttClient({
      transport: factory,
      events: {
        onBegin: (message) => models.push(checkBeginModel(message).model),
        onModelMismatch: (model) => mismatches.push(model),
      },
    })
    await client.connect()
    sockets[0]?.deliverJson(begin({ model: EXPECTED_STT_MODEL, domain: "medical-v1" }))
    expect(models).toEqual(["universal-3-5-pro"])
    expect(sockets[0]?.isOpen).toBe(true)
    expect(mismatches).toEqual([])
  })

  it("closes the socket and reports the model when Begin names a different one", async () => {
    const mismatches: string[] = []
    const closes: boolean[] = []
    const models: (string | null)[] = []
    const client = new SttClient({
      transport: factory,
      events: {
        onBegin: (message) => models.push(checkBeginModel(message).model),
        onModelMismatch: (model) => mismatches.push(model),
        onClose: (_explanation, expected) => closes.push(expected),
      },
    })
    await client.connect()
    sockets[0]?.deliverJson(begin({ model: "universal-3-pro" }))
    expect(mismatches, "a silently swapped model must be surfaced by name").toEqual([
      "universal-3-pro",
    ])
    expect(models).toEqual(["universal-3-pro"])
    expect(sockets[0]?.isOpen, "provenance from an unchosen model is not trusted").toBe(false)
    expect(closes, "the client's own close must not read as a drop to reconnect").toEqual([
      true,
    ])
  })

  it("records null without failing when Begin carries no configuration at all", async () => {
    const mismatches: string[] = []
    const models: (string | null)[] = []
    const client = new SttClient({
      transport: factory,
      events: {
        onBegin: (message) => models.push(checkBeginModel(message).model),
        onModelMismatch: (model) => mismatches.push(model),
      },
    })
    await client.connect()
    sockets[0]?.deliverJson(begin())
    expect(models, "an absent field is recorded as unknown, not as a match").toEqual([null])
    expect(sockets[0]?.isOpen).toBe(true)
    expect(mismatches).toEqual([])
  })

  it("treats an empty model string as absent rather than as a mismatch", () => {
    expect(
      checkBeginModel({ type: "Begin", id: "x", expires_at: 0, configuration: { model: "" } }),
    ).toEqual({ kind: "absent", model: null })
  })
})
