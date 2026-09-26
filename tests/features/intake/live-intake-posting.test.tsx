import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AGENT_SAMPLE_RATE } from "@/audio/resample"
import type { MemoryTransport } from "@/realtime/transport"

const live = vi.hoisted(() => ({
  sockets: [] as { url: string; transport: unknown }[],
  clock: { now: 0 },
}))

vi.mock("@/realtime/transport", async () => {
  const actual =
    await vi.importActual<typeof import("@/realtime/transport")>("@/realtime/transport")
  return {
    ...actual,
    webSocketTransport: (
      url: string,
      listeners: ConstructorParameters<typeof MemoryTransport>[0],
    ) => {
      const transport = new actual.MemoryTransport(listeners)
      live.sockets.push({ url, transport })
      queueMicrotask(() => transport.acceptOpen())
      return transport
    },
  }
})

vi.mock("@/audio/microphone", async () => {
  const actual =
    await vi.importActual<typeof import("@/audio/microphone")>("@/audio/microphone")
  return {
    ...actual,
    requestMicrophone: async () => ({ getTracks: () => [] }) as unknown as MediaStream,
    startCapture: async () => ({
      contextSampleRate: 48000,
      setSttMuted: () => undefined,
      stop: async () => undefined,
    }),
  }
})

class FakeAudioContext {
  readonly destination = {}
  get currentTime() {
    return live.clock.now
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length)
    return { getChannelData: () => data }
  }
  createBufferSource() {
    return {
      buffer: null,
      onended: null,
      connect: () => undefined,
      start: () => undefined,
      stop: () => undefined,
    }
  }
  async close() {}
}

const { IntakeClient } = await import("@app/(pages)/intake-client")

type Posted = { url: string; body: Record<string, unknown> }
let posted: Posted[] = []

function socket(host: "agents" | "streaming"): MemoryTransport {
  const found = live.sockets.filter((entry) =>
    new URL(entry.url).hostname.startsWith(`${host}.`),
  )
  return found[found.length - 1]?.transport as MemoryTransport
}

function audioOfSeconds(seconds: number): string {
  return Buffer.from(new Uint8Array(seconds * AGENT_SAMPLE_RATE * 2)).toString("base64")
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function startTheCall() {
  render(<IntakeClient />)
  fireEvent.click(screen.getByRole("button", { name: "Start listening" }))
  await advance(0)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
  live.sockets.length = 0
  live.clock.now = 0
  posted = []
  globalThis.AudioContext = FakeAudioContext as unknown as typeof AudioContext
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.startsWith("/api/tokens/")) {
      return new Response(
        JSON.stringify({
          token: `t-${live.sockets.length}`,
          sessionId: "srv-issued-9",
          agentId: "",
        }),
        { status: 200 },
      )
    }
    posted.push({ url, body: JSON.parse(String(init?.body)) as Record<string, unknown> })
    return new Response(JSON.stringify({ turnsHeld: 1, candidates: [], decisions: [] }), {
      status: 200,
    })
  }) as unknown as typeof fetch
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("P0-1: the product posts caller turns under the id the server issued", () => {
  it("sends a caller turn to the server-issued session, never a browser-made one", async () => {
    await startTheCall()
    await act(async () => {
      socket("streaming").deliverJson({
        type: "Turn",
        turn_order: 0,
        turn_is_formatted: true,
        end_of_turn: true,
        transcript: "Lisinopril",
        end_of_turn_confidence: 0.9,
        words: [
          { text: "Lisinopril", start: 100, end: 700, confidence: 0.98, word_is_final: true },
        ],
      })
    })
    await advance(0)
    expect(posted.map((entry) => entry.url)).toEqual(["/api/sessions/srv-issued-9/turns"])
  })
})

describe("P0-2: the product posts the agent's read-back with how much of it was heard", () => {
  it("posts a completed reply once its audio has played out", async () => {
    await startTheCall()
    const agent = socket("agents")
    await act(async () => {
      agent.deliverJson({ type: "reply.started", reply_id: "rb-1" })
      agent.deliverJson({ type: "reply.audio", data: audioOfSeconds(1) })
      agent.deliverJson({
        type: "transcript.agent",
        text: "Lisinopril, is that right?",
        reply_id: "rb-1",
      })
      agent.deliverJson({ type: "reply.done", status: "completed" })
    })
    expect(posted, "a reply still playing has not been heard yet").toEqual([])
    live.clock.now = 1
    await advance(200)
    expect(posted).toEqual([
      {
        url: "/api/sessions/srv-issued-9/turns",
        body: {
          role: "agent",
          replyId: "rb-1",
          text: "Lisinopril, is that right?",
          status: "completed",
          playedMs: 1000,
          durationMs: 1000,
        },
      },
    ])
  })

  it("posts an interrupted reply as interrupted, with less played than scheduled", async () => {
    await startTheCall()
    const agent = socket("agents")
    await act(async () => {
      agent.deliverJson({ type: "reply.started", reply_id: "rb-2" })
      agent.deliverJson({ type: "reply.audio", data: audioOfSeconds(2) })
      agent.deliverJson({
        type: "transcript.agent",
        text: "Lisinopril ten",
        reply_id: "rb-2",
        interrupted: true,
      })
    })
    live.clock.now = 0.7
    await act(async () => {
      agent.deliverJson({ type: "input.speech.started" })
      agent.deliverJson({ type: "reply.done", status: "interrupted" })
    })
    await advance(0)
    const turn = posted[0]?.body
    expect(turn?.status).toBe("interrupted")
    expect(turn?.playedMs).toBe(700)
    expect(turn?.durationMs).toBe(2000)
    expect(Number(turn?.playedMs)).toBeLessThan(Number(turn?.durationMs))
  })
})
