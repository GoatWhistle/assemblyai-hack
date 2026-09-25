import { GET as agentRoute } from "@app/api/tokens/agent/route"
import { GET as sttRoute } from "@app/api/tokens/stt/route"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  BUDGET_EXHAUSTED_CODE,
  BUDGET_EXPLANATION,
  CLIENT_SHARE_EXPLANATION,
  clientShareSeconds,
  DEFAULT_SESSION_DURATION_SECONDS,
  dailyBudgetSeconds,
} from "@/domain"
import {
  clientBudgetFor,
  clientKeyOf,
  createMemoryBudget,
  createRedisBudget,
  dailyBudget,
  installDailyBudget,
  layeredBudget,
  UNATTRIBUTED_CLIENT,
} from "@/sessions"
import { configureVendorEnv, freshServerState, stubVendor } from "../api/tokens/vendor-stub"

const original = globalThis.fetch

const SESSION = DEFAULT_SESSION_DURATION_SECONDS

function from(address: string): Headers {
  return new Headers({ "x-real-ip": address })
}

function sttRequest(address: string): Request {
  return new Request("https://readback.example.com/api/tokens/stt", { headers: from(address) })
}

function agentRequest(address: string): Request {
  return new Request("https://readback.example.com/api/tokens/agent", {
    headers: from(address),
  })
}

beforeEach(() => {
  configureVendorEnv()
  freshServerState()
})

afterEach(() => {
  globalThis.fetch = original
  vi.unstubAllEnvs()
})

describe("one client cannot spend the whole daily budget", () => {
  it("names a client by a hash of the platform-reported address, never the address itself", () => {
    const key = clientKeyOf(from("203.0.113.7"))
    expect(key).toMatch(/^[0-9a-f]{16}$/)
    expect(key).not.toContain("203")
    expect(clientKeyOf(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe(key)
    expect(clientKeyOf(new Headers())).toBe(UNATTRIBUTED_CLIENT)
    expect(clientKeyOf(undefined)).toBe(UNATTRIBUTED_CLIENT)
  })

  it("prefers x-real-ip over a forwarded chain the client could have started", () => {
    const headers = new Headers({
      "x-real-ip": "198.51.100.2",
      "x-forwarded-for": "203.0.113.7",
    })
    expect(clientKeyOf(headers)).toBe(clientKeyOf(from("198.51.100.2")))
  })

  it("gives each client half of the daily limit", () => {
    expect(clientShareSeconds(7200)).toBe(3600)
    expect(clientShareSeconds(901)).toBe(451)
    expect(clientShareSeconds(-5)).toBe(0)
  })

  it(`${BUDGET_EXHAUSTED_CODE}: a client past its share is refused while another client still mints`, async () => {
    vi.stubEnv("READBACK_DAILY_BUDGET_SECONDS", String(SESSION * 4))
    installDailyBudget(createMemoryBudget(SESSION * 4))
    stubVendor()
    expect((await sttRoute(sttRequest("203.0.113.7"))).status).toBe(200)
    expect((await agentRoute(agentRequest("203.0.113.7"))).status).toBe(200)
    const refused = await sttRoute(sttRequest("203.0.113.7"))
    expect(refused.status).toBe(429)
    const body = await refused.json()
    expect(body.code).toBe(BUDGET_EXHAUSTED_CODE)
    expect(body.explanation).toBe(CLIENT_SHARE_EXPLANATION)
    expect(body.error).toContain("this client's share")
    expect((await sttRoute(sttRequest("198.51.100.2"))).status).toBe(200)
    expect((await dailyBudget().status(Date.now())).remainingSeconds).toBe(SESSION)
  })

  it("a refusal by the daily budget returns the client's debit and says it is the daily budget", async () => {
    installDailyBudget(createMemoryBudget(SESSION - 1))
    const vendor = stubVendor()
    const response = await sttRoute(sttRequest("203.0.113.7"))
    expect(response.status).toBe(429)
    expect((await response.json()).explanation).toBe(BUDGET_EXPLANATION)
    expect(vendor.calls).toHaveLength(0)
    const client = clientBudgetFor(clientKeyOf(from("203.0.113.7")))
    expect((await client.status(Date.now())).remainingSeconds).toBe(
      clientShareSeconds(dailyBudgetSeconds(process.env)),
    )
  })

  it("a vendor failure refunds both the client's share and the daily budget", async () => {
    stubVendor({ token: () => new Response("nope", { status: 500 }) })
    expect((await sttRoute(sttRequest("203.0.113.7"))).status).toBe(502)
    const client = clientBudgetFor(clientKeyOf(from("203.0.113.7")))
    expect((await client.status(Date.now())).remainingSeconds).toBe(
      clientShareSeconds(dailyBudgetSeconds(process.env)),
    )
    expect((await dailyBudget().status(Date.now())).remainingSeconds).toBe(1_000_000)
  })

  it("layers budgets in order and reports the outer one", async () => {
    const inner = createMemoryBudget(100)
    const outer = createMemoryBudget(1000)
    const layered = layeredBudget([
      { scope: "client", budget: inner },
      { scope: "daily", budget: outer },
    ])
    expect((await layered.debit(60, 0)).granted).toBe(true)
    const refused = await layered.debit(60, 0)
    expect(refused).toMatchObject({ granted: false, scope: "client" })
    expect((await layered.status(0)).remainingSeconds).toBe(940)
    await layered.refund(60, 0)
    expect((await inner.status(0)).remainingSeconds).toBe(100)
    expect((await outer.status(0)).remainingSeconds).toBe(1000)
  })

  it("keeps each client's counter under its own Redis key, beside the daily one", async () => {
    const keys: string[] = []
    const doFetch = vi.fn(async (_url: string, init: RequestInit) => {
      const commands = JSON.parse(String(init.body)) as string[][]
      keys.push(...commands.map((command) => command[1] ?? ""))
      return Response.json(commands.map(() => ({ result: 60 })))
    })
    const budget = createRedisBudget(
      { url: "https://redis.example.com", token: "t" },
      3600,
      doFetch,
      "client:abc",
    )
    await budget.debit(60, Date.UTC(2026, 8, 25))
    expect(keys).toContain("readback:budget:2026-09-25:client:abc")
  })

  it(`${BUDGET_EXHAUSTED_CODE}: the Redis budget refuses an overdraft and gives the seconds back`, async () => {
    let counter = 0
    const doFetch = vi.fn(async (_url: string, init: RequestInit) => {
      const commands = JSON.parse(String(init.body)) as string[][]
      return Response.json(
        commands.map((command) => {
          if (command[0] === "INCRBY") {
            counter += Number(command[2])
          }
          return { result: command[0] === "INCRBY" ? counter : 1 }
        }),
      )
    })
    const budget = createRedisBudget(
      { url: "https://redis.example.com", token: "t" },
      1000,
      doFetch,
    )
    expect((await budget.debit(900, 0)).granted).toBe(true)
    const refused = await budget.debit(900, 0)
    expect(refused.granted).toBe(false)
    expect(refused.status.remainingSeconds).toBe(100)
    expect(counter).toBe(900)
  })
})
