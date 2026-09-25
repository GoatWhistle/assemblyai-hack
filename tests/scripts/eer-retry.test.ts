import { EventEmitter } from "node:events"
import { describe, expect, it } from "vitest"
import { type ConnectDeps, connectStreaming } from "../../scripts/eer/connect"
import {
  isRetryable,
  isTransportFailure,
  type RetryDeps,
  TRANSPORT_BACKOFF_MS,
  VendorError,
  withRetry,
} from "../../scripts/eer/retry"

function connectTimeout(): Error {
  const cause = Object.assign(new Error("Connect Timeout Error"), {
    code: "UND_ERR_CONNECT_TIMEOUT",
  })
  return new TypeError("fetch failed", { cause })
}

function resetError(): Error {
  return Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" })
}

function recordingRetry(): RetryDeps & { slept: number[]; lines: string[] } {
  const slept: number[] = []
  const lines: string[] = []
  return {
    slept,
    lines,
    backoffMs: TRANSPORT_BACKOFF_MS,
    sleep: async (ms) => {
      slept.push(ms)
    },
    log: (line) => {
      lines.push(line)
    },
  }
}

class FakeSocket extends EventEmitter {
  readyState = 0
  readonly url: string
  constructor(url: string) {
    super()
    this.url = url
  }
  send(): void {}
}

function tokenResponse(token: string): Response {
  return new Response(JSON.stringify({ token }), { status: 200 })
}

describe("transport failures are retried with the 5/15/45 s backoff, vendor codes are not all retried", () => {
  it("classifies the failure that crashed the S6 sweep as transport", () => {
    expect(isTransportFailure(connectTimeout())).toBe(true)
    expect(isTransportFailure(resetError())).toBe(true)
    expect(isTransportFailure(new Error("token mint failed with 401"))).toBe(false)
    expect(isTransportFailure(new VendorError("at_capacity", "busy"))).toBe(false)
  })

  it("retries only the three vendor codes the free-tier rule names", () => {
    for (const code of ["at_capacity", "concurrency_exceeded", "internal_error"]) {
      expect(isRetryable(new VendorError(code, code)), code).toBe(true)
    }
    expect(isRetryable(new VendorError("unauthorized", "no"))).toBe(false)
    expect(isRetryable(new VendorError("session_limit", "no"))).toBe(false)
  })

  it("recovers after two transport failures, logging each retry and its wait", async () => {
    const deps = recordingRetry()
    let calls = 0
    const value = await withRetry(
      "hydromorphone",
      async () => {
        calls += 1
        if (calls < 3) {
          throw connectTimeout()
        }
        return "ok"
      },
      deps,
    )
    expect(value).toBe("ok")
    expect(calls).toBe(3)
    expect(deps.slept).toEqual([5000, 15000])
    expect(deps.lines).toHaveLength(2)
    expect(deps.lines[0]).toContain("retry 1/3 for hydromorphone")
    expect(deps.lines[0]).toContain("UND_ERR_CONNECT_TIMEOUT")
  })

  it("gives up after three retries and rethrows the last failure", async () => {
    const deps = recordingRetry()
    let calls = 0
    await expect(
      withRetry(
        "x",
        async () => {
          calls += 1
          throw resetError()
        },
        deps,
      ),
    ).rejects.toThrow("ECONNRESET")
    expect(calls).toBe(4)
    expect(deps.slept).toEqual([5000, 15000, 45000])
  })

  it("never retries a non-retryable vendor refusal, so a bad key is not billed three more times", async () => {
    const deps = recordingRetry()
    let calls = 0
    await expect(
      withRetry(
        "x",
        async () => {
          calls += 1
          throw new VendorError("unauthorized", "token mint failed with 401")
        },
        deps,
      ),
    ).rejects.toThrow("401")
    expect(calls).toBe(1)
    expect(deps.slept).toEqual([])
  })
})

describe("token minting and socket open retry together, with a fresh token each time", () => {
  function connectDeps(
    fetchPlan: readonly (() => Promise<Response>)[],
    openPlan: readonly ("open" | "reset")[],
  ): ConnectDeps & {
    fetched: number
    sockets: FakeSocket[]
    retry: ReturnType<typeof recordingRetry>
  } {
    const sockets: FakeSocket[] = []
    const state = { fetched: 0 }
    const retry = recordingRetry()
    return {
      get fetched() {
        return state.fetched
      },
      sockets,
      retry,
      fetch: async () => {
        const step = fetchPlan[state.fetched] ?? fetchPlan[fetchPlan.length - 1]
        state.fetched += 1
        if (step === undefined) {
          throw new Error("no fetch planned")
        }
        return await step()
      },
      open: (url) => {
        const socket = new FakeSocket(url)
        const outcome = openPlan[sockets.length] ?? "open"
        sockets.push(socket)
        setTimeout(() => {
          if (outcome === "open") {
            socket.readyState = 1
            socket.emit("open")
          } else {
            socket.emit("error", resetError())
          }
        }, 0)
        return socket
      },
    }
  }

  it("retries a connect timeout on the token mint and opens with the second token", async () => {
    const deps = connectDeps(
      [async () => Promise.reject(connectTimeout()), async () => tokenResponse("t2")],
      ["open"],
    )
    const { socket } = await connectStreaming("item", "key", new URLSearchParams(), deps)
    expect(deps.fetched).toBe(2)
    expect((socket as FakeSocket).url).toContain("token=t2")
    expect(deps.retry.slept).toEqual([5000])
  })

  it("retries a socket reset before open and mints a new token, since tokens are single-use", async () => {
    const deps = connectDeps(
      [async () => tokenResponse("t1"), async () => tokenResponse("t2")],
      ["reset", "open"],
    )
    const { socket } = await connectStreaming("item", "key", new URLSearchParams(), deps)
    expect(deps.fetched).toBe(2)
    expect(deps.sockets.map((s) => new URL(s.url).searchParams.get("token"))).toEqual([
      "t1",
      "t2",
    ])
    expect((socket as FakeSocket).url).toContain("token=t2")
  })

  it("retries a mint refused with at_capacity and does not retry one refused with 401", async () => {
    const busy = connectDeps(
      [
        async () => new Response(JSON.stringify({ error: "at_capacity" }), { status: 503 }),
        async () => tokenResponse("t2"),
      ],
      ["open"],
    )
    await connectStreaming("item", "key", new URLSearchParams(), busy)
    expect(busy.fetched).toBe(2)

    const denied = connectDeps(
      [async () => new Response(JSON.stringify({ error: "Invalid API key" }), { status: 401 })],
      ["open"],
    )
    await expect(
      connectStreaming("item", "key", new URLSearchParams(), denied),
    ).rejects.toThrow("401")
    expect(denied.fetched).toBe(1)
    expect(denied.sockets).toHaveLength(0)
  })
})
