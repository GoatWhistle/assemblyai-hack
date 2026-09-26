import { act, fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { preloadInCall } from "@/features/intake/in-call-loader"
import type { MemoryTransport, TransportListeners } from "@/realtime/transport"

export const rig = {
  sockets: [] as { url: string; transport: MemoryTransport }[],
  microphoneRequests: 0,
  requests: [] as { url: string; init: RequestInit | undefined }[],
  route: (() => undefined) as (url: string, init?: RequestInit) => Response | undefined,
}

export async function transportModule() {
  const actual =
    await vi.importActual<typeof import("@/realtime/transport")>("@/realtime/transport")
  return {
    ...actual,
    webSocketTransport: (url: string, listeners: TransportListeners) => {
      const transport = new actual.MemoryTransport(listeners)
      rig.sockets.push({ url, transport })
      queueMicrotask(() => transport.acceptOpen())
      return transport
    },
  }
}

export async function microphoneModule() {
  const actual =
    await vi.importActual<typeof import("@/audio/microphone")>("@/audio/microphone")
  return {
    ...actual,
    requestMicrophone: async () => {
      rig.microphoneRequests += 1
      return { getTracks: () => [] } as unknown as MediaStream
    },
    startCapture: async () => ({
      contextSampleRate: 48000,
      setSttMuted: () => undefined,
      stop: async () => undefined,
    }),
  }
}

class FakeAudioContext {
  readonly destination = {}
  readonly currentTime = 0
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

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

export function socket(host: "agents" | "streaming"): MemoryTransport {
  const found = rig.sockets.filter((entry) =>
    new URL(entry.url).hostname.startsWith(`${host}.`),
  )
  const last = found[found.length - 1]
  if (last === undefined) {
    throw new Error(`no ${host} socket was opened`)
  }
  return last.transport
}

export async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

export async function startTheCall(Client: () => React.ReactNode) {
  await preloadInCall()
  render(<Client />)
  fireEvent.click(screen.getByRole("button", { name: "Start listening" }))
  await advance(0)
}

export async function callerSays(text: string, turnOrder = 0) {
  await act(async () => {
    socket("streaming").deliverJson({
      type: "Turn",
      turn_order: turnOrder,
      turn_is_formatted: true,
      end_of_turn: true,
      transcript: text,
      end_of_turn_confidence: 0.9,
      words: [{ text, start: 100, end: 700, confidence: 1, word_is_final: true }],
    })
  })
  await advance(0)
}

export function resetRig() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
  rig.sockets.length = 0
  rig.microphoneRequests = 0
  rig.requests = []
  rig.route = () => undefined
  globalThis.AudioContext = FakeAudioContext as unknown as typeof AudioContext
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    rig.requests.push({ url, init })
    const routed = rig.route(url, init)
    if (routed !== undefined) {
      return routed
    }
    if (url === "/api/budget") {
      return json({ budget: { remainingSeconds: 7200, exhausted: false } })
    }
    if (url.startsWith("/api/tokens/")) {
      return json({ token: `t-${rig.requests.length}`, sessionId: "srv-7", agentId: "" })
    }
    return json({ turnsHeld: 1, candidates: [], decisions: [] })
  }) as unknown as typeof fetch
}

export function releaseRig() {
  vi.useRealTimers()
  vi.restoreAllMocks()
}
