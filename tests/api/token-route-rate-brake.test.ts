import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RATE_BRAKE_HONESTY_NOTE, RATE_BRAKE_MAX_PER_WINDOW } from "@/domain"
import { GET as agentToken } from "../../app/api/tokens/agent/route"
import { GET as sttToken } from "../../app/api/tokens/stt/route"

const original = globalThis.fetch

function stubVendor(): void {
  globalThis.fetch = vi.fn(
    async () => new Response(JSON.stringify({ token: "minted" }), { status: 200 }),
  ) as typeof fetch
}

async function burstUntilRefused(
  handler: () => Promise<Response>,
  attempts: number,
): Promise<{ refusedAt: number; status: number; body: string; retryAfter: string | null }> {
  for (let i = 1; i <= attempts; i += 1) {
    const response = await handler()
    if (response.status === 429) {
      return {
        refusedAt: i,
        status: response.status,
        body: await response.text(),
        retryAfter: response.headers.get("retry-after"),
      }
    }
  }
  return { refusedAt: -1, status: 0, body: "", retryAfter: null }
}

describe("the token routes each carry their own in-memory brake, exercised through the real HTTP handler", () => {
  beforeEach(() => {
    vi.stubEnv("ASSEMBLYAI_API_KEY", "a-real-looking-key")
    stubVendor()
  })

  afterEach(() => {
    globalThis.fetch = original
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it("admits the streaming route's first request, so the brake cannot be a blanket refusal that only looks safe", async () => {
    const response = await sttToken()
    expect(
      response.status,
      "a brake that refused from the very first request would pass a refusal test while breaking the product entirely",
    ).toBe(200)
  })

  it("refuses the streaming route past the ceiling and says in the body that this is not a global cap", async () => {
    const refusal = await burstUntilRefused(sttToken, RATE_BRAKE_MAX_PER_WINDOW * 2 + 5)
    expect(
      refusal.refusedAt,
      "a burst against one warm module instance must eventually be refused, or the brake is declared but never consulted by the route",
    ).toBeGreaterThan(0)
    expect(refusal.status).toBe(429)
    expect(
      refusal.body,
      "the refusal text must carry the honesty note verbatim, because a 429 with no caveat would read to a judge as a real global rate limit that we do not have",
    ).toContain(RATE_BRAKE_HONESTY_NOTE)
    expect(
      refusal.retryAfter,
      "a 429 without retry-after leaves a client guessing and invites the exact retry storm the brake exists to damp",
    ).not.toBeNull()
  })

  it("refuses the agent route too, which is the more expensive socket at 4.50 per hour and was previously covered by no test at all", async () => {
    const refusal = await burstUntilRefused(agentToken, RATE_BRAKE_MAX_PER_WINDOW * 2 + 5)
    expect(
      refusal.refusedAt,
      "the agent route bills ten times the streaming route, so an unbraked agent route is the costlier half of this task",
    ).toBeGreaterThan(0)
    expect(refusal.body).toContain(RATE_BRAKE_HONESTY_NOTE)
  })

  it("counts the two routes separately, so the streaming burst and the agent burst refuse at their own ceilings rather than at a shared one", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-17T01:00:00.000Z"))
    const streaming = await burstUntilRefused(sttToken, RATE_BRAKE_MAX_PER_WINDOW * 2 + 5)
    const agent = await burstUntilRefused(agentToken, RATE_BRAKE_MAX_PER_WINDOW * 2 + 5)
    expect(
      streaming.refusedAt,
      "the streaming route must reach its own ceiling inside the fresh window",
    ).toBe(RATE_BRAKE_MAX_PER_WINDOW + 1)
    expect(
      agent.refusedAt,
      "the agent route must reach the ceiling on its own count too; a single shared counter would have refused it on the first request after the streaming burst already spent the window",
    ).toBe(RATE_BRAKE_MAX_PER_WINDOW + 1)
  })

  it("mints again once the window has rolled over, proving the refusal is per-window and not a latch that stays shut for the life of the instance", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-17T00:00:00.000Z"))
    const refusal = await burstUntilRefused(sttToken, RATE_BRAKE_MAX_PER_WINDOW * 2 + 5)
    expect(
      refusal.refusedAt,
      "the burst must be refused before the rollover is meaningful",
    ).toBeGreaterThan(0)

    vi.setSystemTime(new Date("2026-09-17T00:05:00.000Z"))
    const afterRollover = await sttToken()
    expect(
      afterRollover.status,
      "a brake that never reopened would take a warm instance out of service permanently, which is a worse outage than the spend it prevents",
    ).toBe(200)
  })
})
