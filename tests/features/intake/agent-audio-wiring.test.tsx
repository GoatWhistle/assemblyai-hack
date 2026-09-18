import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryTransport, type TransportFactory } from "@/realtime/transport"

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

const enqueued: string[] = []
let flushCount = 0
let closeCount = 0

vi.mock("@/audio/playback", () => ({
  createPlayback: () => ({
    enqueue: (base64: string) => enqueued.push(base64),
    flush: () => {
      flushCount += 1
    },
    close: async () => {
      closeCount += 1
    },
    get scheduledCount() {
      return 0
    },
  }),
}))

const { useSession } = await import("@/features/intake/use-session")

let sockets: MemoryTransport[] = []

const factory: TransportFactory = (_url, listeners) => {
  const transport = new MemoryTransport(listeners)
  sockets.push(transport)
  queueMicrotask(() => transport.acceptOpen())
  return transport
}

function Harness() {
  const session = useSession({ transport: factory })
  return (
    <div>
      <button type="button" onClick={() => void session.start()}>
        open the line
      </button>
      <button type="button" onClick={() => void session.stop()}>
        close the line
      </button>
    </div>
  )
}

beforeEach(() => {
  sockets = []
  enqueued.length = 0
  flushCount = 0
  closeCount = 0
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ token: "token-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ) as unknown as typeof fetch
  globalThis.AudioContext = class {} as unknown as typeof AudioContext
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function openTheLine() {
  await userEvent.click(screen.getByRole("button", { name: /open the line/i }))
  await act(async () => {
    await Promise.resolve()
  })
}

describe("the agent's spoken reply reaches a real playback sink, not just the transcript", () => {
  it("enqueues an audio frame from the agent socket into the playback sink", async () => {
    render(<Harness />)
    await openTheLine()
    const agentSocket = sockets[0]
    await act(async () => {
      agentSocket?.deliverJson({ type: "audio", audio: "AAAA" })
    })
    expect(
      enqueued,
      "audio carried by the agent socket must reach the playback sink or the judge hears nothing",
    ).toContain("AAAA")
  })

  it("flushes the playback sink when the caller starts speaking, so the agent does not talk over them", async () => {
    render(<Harness />)
    await openTheLine()
    const agentSocket = sockets[0]
    await act(async () => {
      agentSocket?.deliverJson({ type: "audio", audio: "AAAA" })
      agentSocket?.deliverJson({ type: "input.speech.started" })
    })
    expect(
      flushCount,
      "a barge-in must stop already-scheduled agent audio, per the documented interruption handling",
    ).toBe(1)
  })

  it("closes the playback sink when the session stops", async () => {
    render(<Harness />)
    await openTheLine()
    const agentSocket = sockets[0]
    const sttSocket = sockets[1]
    await act(async () => {
      agentSocket?.deliverJson({ type: "audio", audio: "AAAA" })
    })
    const stopClick = userEvent.click(screen.getByRole("button", { name: /close the line/i }))
    await act(async () => {
      agentSocket?.deliverJson({ type: "session.ended" })
      sttSocket?.deliverJson({ type: "Termination" })
      await stopClick
    })
    expect(closeCount, "stopping a session must release its playback AudioContext").toBe(1)
  })
})
