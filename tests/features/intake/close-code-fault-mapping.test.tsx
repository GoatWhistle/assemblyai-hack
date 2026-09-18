import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SessionFault } from "@/features/intake/session-status"
import { CloseCode } from "@/realtime/close-codes"
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
    </div>
  )
}

beforeEach(() => {
  sockets = []
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ token: "token-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ) as unknown as typeof fetch
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

describe("a socket close code reaches the fault shown on screen, not one shared bucket", () => {
  it("maps the free-tier session-limit close code to the concurrency fault", async () => {
    render(<Harness />)
    await openTheLine()
    await act(async () => {
      sockets[0]?.close(CloseCode.SessionLimit, "")
    })
    expect(
      screen.getByRole("status").textContent,
      "3009 is the documented session-limit code and must not read as a generic dropped socket",
    ).toBe(SessionFault.ConcurrencyReached)
  })

  it("maps the observed rate-limit close code 1008 to the concurrency fault", async () => {
    render(<Harness />)
    await openTheLine()
    await act(async () => {
      sockets[0]?.close(CloseCode.PolicyViolation, "")
    })
    expect(
      screen.getByRole("status").textContent,
      "1008 is what the free tier actually sends for the rate limit; it must not surface as an unexplained drop",
    ).toBe(SessionFault.ConcurrencyReached)
  })

  it("leaves an ordinary drop as SocketDropped", async () => {
    render(<Harness />)
    await openTheLine()
    await act(async () => {
      sockets[0]?.close(3006, "")
    })
    expect(
      screen.getByRole("status").textContent,
      "a code with no concurrency meaning must not be misreported as a capacity fault",
    ).toBe(SessionFault.SocketDropped)
  })
})

describe("a 429 from the token route reaches the fault shown on screen", () => {
  it("maps a 429 token mint to the concurrency fault, not the generic token-failed fault", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "rate brake" }), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
    ) as unknown as typeof fetch
    render(<Harness />)
    await openTheLine()
    expect(
      screen.getByRole("status").textContent,
      "the token route's own rate brake returns 429, and collapsing it into TokenFailed hides a genuinely different remedy",
    ).toBe(SessionFault.ConcurrencyReached)
  })

  it("keeps a non-429 token failure as TokenFailed", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "no key configured" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
    ) as unknown as typeof fetch
    render(<Harness />)
    await openTheLine()
    expect(
      screen.getByRole("status").textContent,
      "a 500 is a server misconfiguration, not a capacity limit, and must not be reported as one",
    ).toBe(SessionFault.TokenFailed)
  })
})
