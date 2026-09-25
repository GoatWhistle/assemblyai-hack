import { act, fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import type { AgentTurn, SessionBinding } from "@/domain"
import type { useSession as UseSession } from "@/features/intake/use-session"
import { MemoryTransport, type TransportFactory } from "@/realtime/transport"

export type LiveSocket = { readonly url: string; readonly transport: MemoryTransport }

export type SessionRig = {
  readonly sockets: LiveSocket[]
  readonly tokenRequests: string[]
  readonly muted: boolean[]
  readonly agentTurns: AgentTurn[]
  readonly bindings: SessionBinding[]
  readonly factory: TransportFactory
}

export function createRig(): SessionRig {
  const sockets: LiveSocket[] = []
  const tokenRequests: string[] = []
  let minted = 0
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (!url.startsWith("/api/tokens/")) {
      return new Response(
        JSON.stringify({ budget: { remainingSeconds: 7200, exhausted: false } }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      )
    }
    tokenRequests.push(url)
    minted += 1
    return new Response(
      JSON.stringify({ token: `token-${minted}`, sessionId: "server-session-1", agentId: "" }),
      { status: 200, headers: { "content-type": "application/json" } },
    )
  }) as unknown as typeof fetch
  return {
    sockets,
    tokenRequests,
    muted: [],
    agentTurns: [],
    bindings: [],
    factory: (url, listeners) => {
      const transport = new MemoryTransport(listeners)
      sockets.push({ url, transport })
      queueMicrotask(() => transport.acceptOpen())
      return transport
    },
  }
}

export function latestSocket(rig: SessionRig, host: "agents" | "streaming"): MemoryTransport {
  const found = rig.sockets.filter((socket) => socket.url.includes(`${host}.assemblyai.com`))
  const last = found[found.length - 1]
  if (last === undefined) {
    throw new Error(`no ${host} socket was opened`)
  }
  return last.transport
}

export function socketCount(rig: SessionRig, host: "agents" | "streaming"): number {
  return rig.sockets.filter((socket) => socket.url.includes(`${host}.assemblyai.com`)).length
}

export function renderSession(useSession: typeof UseSession, rig: SessionRig) {
  function Harness() {
    const session = useSession({
      transport: rig.factory,
      onAgentTurn: (turn) => rig.agentTurns.push(turn),
      onSessionBound: (binding) => rig.bindings.push(binding),
    })
    return (
      <div>
        <button type="button" onClick={() => void session.start()}>
          open the line
        </button>
        <button type="button" onClick={() => void session.stop()}>
          close the line
        </button>
        <output data-testid="phase">{session.phase}</output>
        <output data-testid="fault">{session.fault ?? "none"}</output>
        <output data-testid="model">{session.sttModel ?? "unknown"}</output>
        <output data-testid="session">{session.sessionId ?? "unbound"}</output>
      </div>
    )
  }
  return render(<Harness />)
}

export async function settle(ms = 0): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

export async function openTheLine(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: /open the line/i }))
  await settle()
}

export function shown(id: "phase" | "fault" | "model" | "session"): string {
  return screen.getByTestId(id).textContent ?? ""
}

export function sentTypes(socket: MemoryTransport): string[] {
  return socket.sentJson().map((message) => String(message.type))
}
