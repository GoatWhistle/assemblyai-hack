import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FAULT_COPY, SessionFault } from "@/features/intake/session-status"
import { faultForConnectError } from "@/features/intake/start-faults"
import { AgentClient } from "@/realtime/agent-client"
import { SttClient } from "@/realtime/stt-client"
import { TokenMintError } from "@/realtime/tokens"
import { MemoryTransport, SocketOpenError, type TransportFactory } from "@/realtime/transport"

const refusedLikeFirefox: TransportFactory = (_url, listeners) => {
  const transport = new MemoryTransport(listeners)
  queueMicrotask(() => {
    transport.fail(new Event("error"))
    transport.close(1006, "")
  })
  return transport
}

const closedBeforeOpen: TransportFactory = (_url, listeners) => {
  const transport = new MemoryTransport(listeners)
  queueMicrotask(() => transport.close(1006, ""))
  return transport
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ token: "minted", sessionId: "server-session-1", agentId: "" }),
          { status: 200 },
        ),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function rejectionOf(connect: Promise<void>): Promise<unknown> {
  return connect.then(
    () => null,
    (error: unknown) => error,
  )
}

describe("a socket that will not open after both tokens were minted", () => {
  it("rejects as SocketOpenError from either client, whether the error or the close comes first", async () => {
    const stt = await rejectionOf(new SttClient({ transport: refusedLikeFirefox }).connect())
    const agent = await rejectionOf(
      new AgentClient({ transport: refusedLikeFirefox }).connect(),
    )
    const closed = await rejectionOf(new SttClient({ transport: closedBeforeOpen }).connect())

    expect(stt).toBeInstanceOf(SocketOpenError)
    expect(stt).toMatchObject({ socket: "stt", closeCode: null })
    expect(agent).toMatchObject({ socket: "agent", closeCode: null })
    expect(closed).toMatchObject({ socket: "stt", closeCode: 1006 })
    expect(String(closed)).toContain("the stt socket closed before opening: 1006")
  })

  it("is shown as an unreachable service, not as a token that could not be minted", async () => {
    const error = await rejectionOf(
      new AgentClient({ transport: refusedLikeFirefox }).connect(),
    )

    expect(
      faultForConnectError(error),
      "the npi-groups run of 27 September minted both tokens and told the user no token could be minted",
    ).toBe(SessionFault.SocketUnreachable)
    expect(faultForConnectError(new TokenMintError("/api/tokens/stt", 500, "boom"))).toBe(
      SessionFault.TokenFailed,
    )
    expect(faultForConnectError(new Error("anything else"))).toBe(SessionFault.TokenFailed)
  })

  it("tells the user what happened and what to check, without claiming more than it knows", () => {
    const copy = FAULT_COPY[SessionFault.SocketUnreachable]
    const text = `${copy.title} ${copy.body} ${copy.remedy}`

    expect(copy.body).toMatch(/tokens were issued/i)
    expect(copy.remedy).toMatch(/firewall/i)
    expect(copy.remedy).toMatch(/wss/)
    expect(copy.remedy).toContain("assemblyai.com")
    expect(copy.remedy).toMatch(/start again/i)
    expect(text).not.toMatch(/could not be minted/i)
    expect(
      text,
      "a socket that opened before the other failed was billed for a moment, so the live harness must not read this as unbilled",
    ).not.toMatch(/no token was issued|nothing was billed/i)
  })
})
