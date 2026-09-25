import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AgentClient } from "@/realtime/agent-client"
import { agentTokenRoute, mintAgentToken, TokenMintError } from "@/realtime/tokens"
import { MemoryTransport, type TransportFactory } from "@/realtime/transport"

let sockets: MemoryTransport[] = []
let urls: string[] = []
let requests: { url: string; method: string }[] = []

const factory: TransportFactory = (url, listeners) => {
  const transport = new MemoryTransport(listeners)
  sockets.push(transport)
  urls.push(url)
  queueMicrotask(() => transport.acceptOpen())
  return transport
}

function stubAgentRoute(body: (counter: number) => Record<string, unknown>) {
  let counter = 0
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    counter += 1
    requests.push({ url: String(input), method: init?.method ?? "GET" })
    return new Response(JSON.stringify(body(counter)), { status: 200 })
  }) as unknown as typeof fetch
}

beforeEach(() => {
  sockets = []
  urls = []
  requests = []
  stubAgentRoute((n) => ({ token: `agent-token-${n}`, sessionId: "srv-42", agentId: "agt-7" }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("the agent token carries the server-issued session id", () => {
  it("asks the token route with GET, because the route exports GET only", async () => {
    await mintAgentToken("/api/tokens/agent", null)
    expect(requests[0]?.method).toBe("GET")
    expect(requests[0]?.url).toBe("/api/tokens/agent")
  })

  it("returns the binding the server issued", async () => {
    const grant = await mintAgentToken("/api/tokens/agent", null)
    expect(grant.binding).toEqual({ sessionId: "srv-42", agentId: "agt-7" })
  })

  it("refuses a token response with no session id instead of inventing one", async () => {
    stubAgentRoute(() => ({ token: "agent-token" }))
    await expect(mintAgentToken("/api/tokens/agent", null)).rejects.toBeInstanceOf(
      TokenMintError,
    )
  })

  it("puts the session id in the reconnect query", () => {
    expect(agentTokenRoute("/api/tokens/agent", "srv 42")).toBe(
      "/api/tokens/agent?sessionId=srv+42",
    )
  })

  it("reports the binding once and reconnects under the same session with a new token", async () => {
    const bound: string[] = []
    const client = new AgentClient({
      transport: factory,
      events: { onBound: (binding) => bound.push(binding.sessionId) },
    })
    await client.connect()
    await client.reconnect()
    expect(bound).toEqual(["srv-42"])
    expect(requests.map((r) => r.url)).toEqual([
      "/api/tokens/agent",
      "/api/tokens/agent?sessionId=srv-42",
    ])
    expect(urls[0]).toContain("token=agent-token-1")
    expect(urls[1]).toContain("token=agent-token-2")
  })

  it("binds the stored agent from the token response into session.update", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    const update = sockets[0]?.sentJson()[0] as { session: Record<string, unknown> }
    expect(update.session.agent_id).toBe("agt-7")
  })

  it("sends agent_id alone, because the vendor closes 1008 when it arrives with any other session field", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    const update = sockets[0]?.sentJson()[0] as { session: Record<string, unknown> }
    expect(update.session).toEqual({ agent_id: "agt-7" })
  })

  it("refuses a reconnect token issued for another session", async () => {
    const client = new AgentClient({ transport: factory })
    await client.connect()
    stubAgentRoute(() => ({ token: "agent-token-x", sessionId: "someone-else", agentId: "" }))
    await expect(client.reconnect()).rejects.toBeInstanceOf(TokenMintError)
  })
})
