import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  MAX_EXPIRES_IN_SECONDS,
  MAX_SESSION_DURATION_SECONDS,
  MIN_SESSION_DURATION_SECONDS,
  tokenLifetime,
} from "@/domain"
import { GET as agentToken } from "../../app/api/tokens/agent/route"
import { GET as sttToken } from "../../app/api/tokens/stt/route"

const original = globalThis.fetch

function stubVendor(): { urls: string[]; headers: string[] } {
  const urls: string[] = []
  const headers: string[] = []
  globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    urls.push(String(url))
    const given = (init?.headers ?? {}) as Record<string, string>
    headers.push(given.Authorization ?? "")
    return new Response(JSON.stringify({ token: "minted" }), { status: 200 })
  }) as typeof fetch
  return { urls, headers }
}

describe("the token routes never let a misconfigured environment reach the vendor", () => {
  beforeEach(() => {
    vi.stubEnv("ASSEMBLYAI_API_KEY", "a-real-looking-key")
  })

  afterEach(() => {
    globalThis.fetch = original
    vi.unstubAllEnvs()
  })

  it("clamps a session duration above the documented 10800 second ceiling", () => {
    const lifetime = tokenLifetime({ MAX_SESSION_DURATION_SECONDS: "10800000" })
    expect(lifetime.maxSessionDurationSeconds).toBe(MAX_SESSION_DURATION_SECONDS)
  })

  it("clamps a session duration below the documented 60 second floor", () => {
    expect(tokenLifetime({ MAX_SESSION_DURATION_SECONDS: "1" }).maxSessionDurationSeconds).toBe(
      MIN_SESSION_DURATION_SECONDS,
    )
  })

  it("clamps an expiry above the documented 600 second ceiling", () => {
    expect(tokenLifetime({ TOKEN_EXPIRES_IN_SECONDS: "99999" }).expiresInSeconds).toBe(
      MAX_EXPIRES_IN_SECONDS,
    )
  })

  it("falls back to the default when the environment value is not a number", () => {
    const lifetime = tokenLifetime({
      MAX_SESSION_DURATION_SECONDS: "banana",
      TOKEN_EXPIRES_IN_SECONDS: "",
    })
    expect(lifetime.maxSessionDurationSeconds).toBe(900)
    expect(lifetime.expiresInSeconds).toBe(60)
  })

  it("never puts NaN in the query string, which guarantees a useless 502", async () => {
    vi.stubEnv("MAX_SESSION_DURATION_SECONDS", "banana")
    const { urls } = stubVendor()
    await sttToken()
    expect(urls[0]).not.toContain("NaN")
    expect(urls[0]).toContain("max_session_duration_seconds=900")
  })

  it("keeps the vendor status code out of the response body", async () => {
    globalThis.fetch = vi.fn(async () => new Response("nope", { status: 401 })) as typeof fetch
    const response = await sttToken()
    const body = await response.json()
    expect(response.status).toBe(502)
    expect(Object.keys(body)).toEqual(["error"])
    expect(JSON.stringify(body)).not.toContain("401")
  })

  it("never returns the key itself, only a minted token", async () => {
    stubVendor()
    const body = await (await sttToken()).json()
    expect(JSON.stringify(body)).not.toContain("a-real-looking-key")
    expect(body.token).toBe("minted")
  })

  it("keeps sending the documented header shape per host", async () => {
    const stt = stubVendor()
    await sttToken()
    expect(stt.headers[0]).toBe("a-real-looking-key")
    const agent = stubVendor()
    await agentToken()
    expect(agent.headers[0]).toBe("Bearer a-real-looking-key")
  })

  it("refuses to mint when no key is configured, without saying what the key looks like", async () => {
    vi.stubEnv("ASSEMBLYAI_API_KEY", "")
    const response = await sttToken()
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain("Bearer")
  })

  it("marks the token response uncacheable so a shared cache cannot hand it to a stranger", async () => {
    stubVendor()
    const response = await sttToken()
    expect(response.headers.get("cache-control")).toBe("no-store")
  })

  it("drops an unexpected upstream field instead of forwarding whatever the vendor sent", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            token: "minted",
            account_id: "acct_should_never_leave_the_server",
            internal_debug: { quotaRemaining: 42 },
          }),
          { status: 200 },
        ),
    ) as typeof fetch
    const body = await (await sttToken()).json()
    expect(
      Object.keys(body).sort(),
      "the allowlist exists precisely so a new upstream field cannot reach the browser unnoticed",
    ).toEqual(["expiresInSeconds", "maxSessionDurationSeconds", "token"])
    expect(JSON.stringify(body)).not.toContain("acct_should_never_leave_the_server")
    expect(JSON.stringify(body)).not.toContain("quotaRemaining")
  })

  it("drops an unexpected upstream field on the agent route too, keeping only our own agentId beside it", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ token: "minted", account_id: "acct_should_never_leave_the_server" }),
          { status: 200 },
        ),
    ) as typeof fetch
    const body = await (await agentToken()).json()
    expect(Object.keys(body).sort()).toEqual([
      "agentId",
      "expiresInSeconds",
      "maxSessionDurationSeconds",
      "token",
    ])
    expect(JSON.stringify(body)).not.toContain("acct_should_never_leave_the_server")
  })

  it("refuses a non-string token from the vendor rather than forwarding it under a field typed as string", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ token: 123456 }), { status: 200 }),
    ) as typeof fetch
    const response = await sttToken()
    expect(response.status).toBe(502)
  })
})
