import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SessionFault } from "@/features/intake/session-status"
import { MemoryTransport, type TransportFactory } from "@/realtime/transport"

vi.mock("@/audio/microphone", async () => {
  const actual =
    await vi.importActual<typeof import("@/audio/microphone")>("@/audio/microphone")
  return {
    ...actual,
    requestMicrophone: async () => ({ getTracks: () => [] }) as unknown as MediaStream,
    startCapture: async () => {
      throw new Error("AbortError: Unable to load a worklet's module")
    },
  }
})

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
      <output>{session.fault ?? "none"}</output>
      <p>{session.phase}</p>
    </div>
  )
}

function textsSent(socket: MemoryTransport | undefined): string {
  return (socket?.sent ?? []).filter((frame) => typeof frame === "string").join("\n")
}

beforeEach(() => {
  sockets = []
  globalThis.fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ token: "token-1", sessionId: "server-session-1", agentId: "agent-1" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  ) as unknown as typeof fetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("a capture that fails after both sockets opened ends the session instead of hanging", () => {
  it("shows the capture fault and ends both sockets rather than leaving them open and billing", async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: /open the line/i }))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(screen.getByRole("status").textContent).toBe(SessionFault.CaptureFailed)
    expect(sockets.length).toBe(2)
    expect(textsSent(sockets[0])).toContain("session.end")
    expect(textsSent(sockets[1])).toContain("Terminate")
  })
})
