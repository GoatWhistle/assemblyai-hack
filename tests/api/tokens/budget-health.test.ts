import { GET as budgetRoute } from "@app/api/budget/route"
import { GET as healthRoute } from "@app/api/health/route"
import { GET as agentRoute } from "@app/api/tokens/agent/route"
import { GET as sttRoute } from "@app/api/tokens/stt/route"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  BUDGET_EXHAUSTED_CODE,
  BUDGET_EXPLANATION,
  DEFAULT_SESSION_DURATION_SECONDS,
  type DeployHealth,
  RATE_BRAKE_HONESTY_NOTE,
  STT_MODEL,
} from "@/domain"
import { createMemoryBudget, dailyBudget, installDailyBudget } from "@/sessions"
import {
  agentTokenRequest,
  configureVendorEnv,
  freshServerState,
  stubVendor,
  VENDOR_KEY,
  VENDOR_TOOL_SECRET,
} from "./vendor-stub"

const original = globalThis.fetch

beforeEach(() => {
  configureVendorEnv()
  freshServerState()
})

afterEach(() => {
  globalThis.fetch = original
  vi.unstubAllEnvs()
})

describe("T5: every minted token is paid from one daily budget", () => {
  it("debits the session ceiling on a streaming mint", async () => {
    installDailyBudget(createMemoryBudget(10_000))
    stubVendor()
    expect((await sttRoute()).status).toBe(200)
    const status = await dailyBudget().status(Date.now())
    expect(status.remainingSeconds).toBe(10_000 - DEFAULT_SESSION_DURATION_SECONDS)
  })

  it("debits the session ceiling on an agent mint", async () => {
    installDailyBudget(createMemoryBudget(10_000))
    stubVendor()
    expect((await agentRoute(agentTokenRequest())).status).toBe(200)
    const status = await dailyBudget().status(Date.now())
    expect(status.remainingSeconds).toBe(10_000 - DEFAULT_SESSION_DURATION_SECONDS)
  })

  it("refunds the debit when the vendor refuses to mint", async () => {
    installDailyBudget(createMemoryBudget(10_000))
    stubVendor({ token: () => new Response("nope", { status: 500 }) })
    expect((await sttRoute()).status).toBe(502)
    expect((await agentRoute(agentTokenRequest())).status).toBe(502)
    expect((await dailyBudget().status(Date.now())).remainingSeconds).toBe(10_000)
  })

  it("refunds the debit when the per-session agent cannot be created", async () => {
    installDailyBudget(createMemoryBudget(10_000))
    const vendor = stubVendor({ agent: () => new Response("bad", { status: 422 }) })
    expect((await agentRoute(agentTokenRequest())).status).toBe(502)
    expect(vendor.tokenCalls()).toHaveLength(0)
    expect((await dailyBudget().status(Date.now())).remainingSeconds).toBe(10_000)
  })

  it(`${BUDGET_EXHAUSTED_CODE}: refuses to mint once spent and explains whose credit it is`, async () => {
    installDailyBudget(createMemoryBudget(DEFAULT_SESSION_DURATION_SECONDS - 1))
    const vendor = stubVendor()
    for (const response of [await sttRoute(), await agentRoute(agentTokenRequest())]) {
      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.code).toBe(BUDGET_EXHAUSTED_CODE)
      expect(body.explanation).toBe(BUDGET_EXPLANATION)
      expect(body.budget.exhausted).toBe(false)
      expect(body.requestedSeconds).toBe(DEFAULT_SESSION_DURATION_SECONDS)
      expect(body.resetsAt).toMatch(/T00:00:00.000Z$/)
    }
    expect(vendor.calls, "an exhausted budget must stop before any vendor call").toHaveLength(0)
  })

  it("reports the budget at GET /api/budget", async () => {
    installDailyBudget(createMemoryBudget(3600))
    const body = await (await budgetRoute()).json()
    expect(body.budget).toEqual({ remainingSeconds: 3600, exhausted: false })
    expect(body.backend).toBe("memory")
    expect(body.explanation).toBe(BUDGET_EXPLANATION)
  })
})

describe("T7: /api/health is public and carries no secret", () => {
  it("answers the DeployHealth shape", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "0123456789abcdef0123456789abcdef01234567")
    const body = (await (await healthRoute()).json()) as DeployHealth
    expect(Object.keys(body).sort()).toEqual([
      "budget",
      "buildSha",
      "maxSessionDurationSeconds",
      "model",
      "rateBrakeNote",
      "tokenExpiresInSeconds",
    ])
    expect(body.model).toBe(STT_MODEL)
    expect(body.rateBrakeNote).toBe(RATE_BRAKE_HONESTY_NOTE)
    expect(body.buildSha).toBe("0123456789abcdef0123456789abcdef01234567")
  })

  it("contains no secret and no environment value other than the build sha", async () => {
    const planted: Record<string, string> = {
      ASSEMBLYAI_API_KEY: VENDOR_KEY,
      AGENT_TOOL_SECRET: VENDOR_TOOL_SECRET,
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_planted_value",
      UPSTASH_REDIS_REST_TOKEN: "planted-upstash-token-value",
      KV_REST_API_TOKEN: "planted-kv-token-value",
      AGENT_LLM_MODEL: "planted-model-name",
      NEXT_PUBLIC_APP_URL: "https://planted.example.com",
      READBACK_ORIGIN: "planted-origin",
    }
    for (const [name, value] of Object.entries(planted)) {
      vi.stubEnv(name, value)
    }
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "not a sha; planted-sha-text")
    const text = await (await healthRoute()).text()
    for (const [name, value] of Object.entries(planted)) {
      expect(text.includes(value), `${name} leaked into /api/health`).toBe(false)
    }
    expect(text).not.toContain("planted-sha-text")
    const serialisedEnv = Object.entries(process.env)
      .filter(([, value]) => typeof value === "string" && value.length >= 12)
      .filter(([name]) => !["VERCEL_GIT_COMMIT_SHA", "TZ"].includes(name))
    for (const [name, value] of serialisedEnv) {
      expect(text.includes(String(value)), `${name} leaked into /api/health`).toBe(false)
    }
  })
})
