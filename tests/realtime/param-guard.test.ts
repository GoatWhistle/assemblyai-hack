import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SocketParamError } from "@/domain"
import { SessionFault } from "@/features/intake/session-status"
import { faultForConnectError } from "@/features/intake/start-faults"
import { AgentClient } from "@/realtime/agent-client"
import { guardAgentInput, guardAgentSession } from "@/realtime/param-guard"
import { SttClient } from "@/realtime/stt-client"
import { MemoryTransport, type TransportFactory } from "@/realtime/transport"

let fetches: string[] = []
let opened: MemoryTransport[] = []

const factory: TransportFactory = (_url, listeners) => {
  const transport = new MemoryTransport(listeners)
  opened.push(transport)
  queueMicrotask(() => transport.acceptOpen())
  return transport
}

beforeEach(() => {
  fetches = []
  opened = []
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    fetches.push(String(input))
    return new Response(JSON.stringify({ token: "t", sessionId: "s-1", agentId: "" }), {
      status: 200,
    })
  }) as unknown as typeof fetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("H10: a parameter the socket does not document is refused before the socket opens", () => {
  it("refuses the agent's spelling on the recognizer socket without minting a token", async () => {
    const client = new SttClient({ transport: factory, query: { min_silence: "400" } })
    const attempt = client.connect()
    await expect(attempt).rejects.toBeInstanceOf(SocketParamError)
    await expect(attempt).rejects.toThrow(
      /min_silence \(this socket calls it min_turn_silence\)/,
    )
    expect(fetches, "a refused configuration must not spend a token").toEqual([])
    expect(opened).toEqual([])
  })

  it("maps the refusal to its own fault rather than to a token failure", () => {
    expect(faultForConnectError(new SocketParamError("stt", ["min_silence"]))).toBe(
      SessionFault.SocketParamRefused,
    )
  })

  it("refuses a recognizer patch with the agent's spelling and sends nothing", async () => {
    const client = new SttClient({ transport: factory })
    await client.connect()
    const before = opened[0]?.sent.length ?? 0
    expect(() => client.updateConfiguration({ min_silence: 300 })).toThrow(SocketParamError)
    expect(opened[0]?.sent.length).toBe(before)
    client.updateConfiguration({ min_turn_silence: 300, max_turn_silence: 1200 })
    expect(opened[0]?.sentJson().at(-1)).toMatchObject({ type: "UpdateConfiguration" })
  })

  it("refuses the recognizer's spelling on the agent socket and sends nothing", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    const socket = opened[0]
    const before = socket?.sent.length ?? 0
    expect(() =>
      client.updateTurnDetection({ turn_detection: { min_turn_silence: 300 } }),
    ).toThrow(/turn_detection\.min_turn_silence/)
    expect(socket?.sent.length).toBe(before)
    client.updateTurnDetection({ turn_detection: { vad_threshold: 0.5 } })
    expect(socket?.sent.length).toBe(before + 1)
  })

  it("lets the shipped connection query through untouched", async () => {
    const client = new SttClient({ transport: factory })
    await client.connect()
    expect(opened).toHaveLength(1)
  })
})

describe("the agent socket refuses the two fields that switch off adaptive pacing", () => {
  it("refuses min_silence and max_silence in a live patch and sends nothing", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    const socket = opened[0]
    const before = socket?.sent.length ?? 0
    for (const field of ["min_silence", "max_silence"]) {
      expect(() => client.updateTurnDetection({ turn_detection: { [field]: 900 } })).toThrow(
        /adaptive pacing/,
      )
    }
    expect(socket?.sent.length).toBe(before)
  })

  it("refuses them in a whole session update as well, although the vendor documents both", () => {
    expect(() =>
      guardAgentSession({
        input: { turn_detection: { vad_threshold: 0.5, max_silence: 2000 } },
      }),
    ).toThrow(SocketParamError)
    expect(() =>
      guardAgentSession({ input: { turn_detection: { vad_threshold: 0.5 } } }),
    ).not.toThrow()
  })

  it("names the refusal by its own code, not as an undocumented field", () => {
    try {
      guardAgentInput({ turn_detection: { min_silence: 400 } })
      expect.unreachable("min_silence must be refused")
    } catch (error) {
      expect((error as SocketParamError).code).toBe("E_PACING_DISABLING_PARAM")
    }
  })
})
