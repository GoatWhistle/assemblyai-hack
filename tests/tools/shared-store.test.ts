import { describe, expect, it } from "vitest"
import { BUDGET_EXHAUSTED_CODE, SessionStorageError } from "@/domain"
import {
  chooseDailyBudget,
  createMemoryBudget,
  type FetchLike,
  mintWithinBudget,
} from "@/sessions"
import {
  chooseIntakeEventStore,
  createMemoryEventStore,
  INTAKE_KEY_PREFIX,
  type IntakeEvent,
} from "@/tools"

type Sent = { url: string; body: unknown }

function fakeRedis(): { sent: Sent[]; doFetch: FetchLike } {
  const lists = new Map<string, string[]>()
  const counters = new Map<string, number>()
  const sent: Sent[] = []
  function run(command: readonly string[]): unknown {
    const [name, key = "", ...rest] = command
    switch (name) {
      case "RPUSH": {
        const list = lists.get(key) ?? []
        list.push(...rest)
        lists.set(key, list)
        return list.length
      }
      case "LRANGE":
        return lists.get(key) ?? []
      case "DEL":
        lists.delete(key)
        return 1
      case "EXPIRE":
        return 1
      case "INCRBY": {
        const next = (counters.get(key) ?? 0) + Number(rest[0])
        counters.set(key, next)
        return next
      }
      case "GET":
        return counters.has(key) ? String(counters.get(key)) : null
      default:
        return null
    }
  }
  const doFetch: FetchLike = async (url, init) => {
    const body = JSON.parse(String(init.body)) as unknown
    sent.push({ url, body })
    if (url.endsWith("/pipeline")) {
      return Response.json((body as string[][]).map((command) => ({ result: run(command) })))
    }
    return Response.json({ result: run(body as string[]) })
  }
  return { sent, doFetch }
}

const REDIS_ENV = {
  UPSTASH_REDIS_REST_URL: "https://redis.example.com",
  UPSTASH_REDIS_REST_TOKEN: "t",
}

const registered: IntakeEvent = { type: "registered", atMs: 0, agentId: "a", gateEnabled: true }

describe("P0-3: the intake log lives in a shared store and fails closed in production", () => {
  it("refuses to start in production without a shared store, naming the variables", () => {
    expect(() => chooseIntakeEventStore({ NODE_ENV: "production" })).toThrow(
      SessionStorageError,
    )
    expect(() => chooseIntakeEventStore({ NODE_ENV: "production" })).toThrow(
      /UPSTASH_REDIS_REST_URL/,
    )
  })

  it("treats a whitespace-only token as absent", () => {
    expect(() =>
      chooseIntakeEventStore({
        NODE_ENV: "production",
        UPSTASH_REDIS_REST_URL: "https://redis.example.com",
        UPSTASH_REDIS_REST_TOKEN: "   ",
      }),
    ).toThrow(SessionStorageError)
  })

  it("opens the memory store in production only through READBACK_ALLOW_MEMORY_STORE=1", () => {
    const store = chooseIntakeEventStore({
      NODE_ENV: "production",
      READBACK_ALLOW_MEMORY_STORE: "1",
    })
    expect(store.backend()).toBe("memory")
    expect(() =>
      chooseIntakeEventStore({ NODE_ENV: "production", READBACK_ALLOW_MEMORY_STORE: "true" }),
    ).toThrow(SessionStorageError)
  })

  it("uses memory in development so npm run dev needs no store", () => {
    expect(chooseIntakeEventStore({ NODE_ENV: "development" }).backend()).toBe("memory")
  })

  it("accepts the Vercel KV variable names as well as the Upstash ones", () => {
    const store = chooseIntakeEventStore({
      NODE_ENV: "production",
      KV_REST_API_URL: "https://kv.example.com",
      KV_REST_API_TOKEN: "t",
    })
    expect(store.backend()).toBe("redis")
  })

  it("appends with RPUSH and reads back with LRANGE under one key per session", async () => {
    const redis = fakeRedis()
    const store = chooseIntakeEventStore(
      { ...REDIS_ENV, NODE_ENV: "production" },
      redis.doFetch,
    )
    expect(await store.append("s1", registered)).toBe(1)
    expect(await store.read("s1")).toEqual([registered])
    expect(await store.read("s2")).toEqual([])
    const first = redis.sent[0]?.body as string[][]
    expect(first[0]?.[0]).toBe("RPUSH")
    expect(first[0]?.[1]).toBe(`${INTAKE_KEY_PREFIX}s1`)
  })

  it("reads an unparseable stored event as null rather than inventing one", async () => {
    const backing = new Map([["s", [JSON.stringify(registered), "{not json"]]])
    const events = await createMemoryEventStore(backing).read("s")
    expect(events).toEqual([registered, null])
  })
})

describe("T5: the daily budget is atomic over the same shared store", () => {
  it("debits with INCRBY and reverts an overdraft with a negative INCRBY", async () => {
    const redis = fakeRedis()
    const budget = chooseDailyBudget(
      { ...REDIS_ENV, READBACK_DAILY_BUDGET_SECONDS: "1000" },
      redis.doFetch,
    )
    expect(budget.backend()).toBe("redis")
    expect((await budget.debit(900, 0)).granted).toBe(true)
    const refused = await budget.debit(900, 0)
    expect(refused.granted).toBe(false)
    expect(refused.status.remainingSeconds).toBe(100)
    expect((await budget.status(0)).remainingSeconds).toBe(100)
    expect((await budget.refund(900, 0)).remainingSeconds).toBe(1000)
  })

  it("starts a fresh budget on the next UTC day", async () => {
    const budget = createMemoryBudget(1000)
    await budget.debit(1000, Date.parse("2026-09-25T23:59:00Z"))
    expect((await budget.status(Date.parse("2026-09-25T23:59:30Z"))).exhausted).toBe(true)
    expect((await budget.status(Date.parse("2026-09-26T00:00:01Z"))).exhausted).toBe(false)
  })

  it("refuses to count a budget per instance in production", () => {
    expect(() => chooseDailyBudget({ NODE_ENV: "production" })).toThrow(SessionStorageError)
  })

  it(`${BUDGET_EXHAUSTED_CODE}: mintWithinBudget never calls the mint once the budget is spent`, async () => {
    let minted = 0
    const outcome = await mintWithinBudget({
      budget: createMemoryBudget(10),
      seconds: 60,
      nowMs: 0,
      mint: async () => {
        minted += 1
        return "token"
      },
    })
    expect(outcome.kind).toBe("refused")
    expect(minted).toBe(0)
  })

  it("refunds when the mint throws, and reports the error", async () => {
    const budget = createMemoryBudget(100)
    const outcome = await mintWithinBudget({
      budget,
      seconds: 60,
      nowMs: 0,
      mint: async () => {
        throw new Error("upstream down")
      },
    })
    expect(outcome.kind).toBe("failed")
    expect((await budget.status(0)).remainingSeconds).toBe(100)
  })
})
