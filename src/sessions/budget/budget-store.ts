import {
  type BudgetDebit,
  type BudgetStatus,
  budgetDay,
  budgetStatusOf,
  type DailyBudget,
  dailyBudgetSeconds,
  SessionStorageError,
  UpstreamError,
} from "@/domain"
import {
  createRedisRestClient,
  type FetchLike,
  memoryStoreAllowed,
  type RedisRestConfig,
  redisConfigFrom,
  sharedStoreNames,
} from "../redis-rest"

const BUDGET_KEY_PREFIX = "readback:budget:"

const BUDGET_KEY_TTL_SECONDS = 2 * 24 * 60 * 60

function wholeSeconds(seconds: number): number {
  return Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0
}

export function createMemoryBudget(limitSeconds: number): DailyBudget {
  const spent = new Map<string, number>()
  const spentOn = (nowMs: number): number => spent.get(budgetDay(nowMs)) ?? 0
  return {
    async debit(seconds, nowMs) {
      const amount = wholeSeconds(seconds)
      const day = budgetDay(nowMs)
      const next = spentOn(nowMs) + amount
      if (next > limitSeconds) {
        return { granted: false, status: budgetStatusOf(limitSeconds, spentOn(nowMs)) }
      }
      spent.set(day, next)
      return { granted: true, status: budgetStatusOf(limitSeconds, next) }
    },
    async refund(seconds, nowMs) {
      const next = Math.max(0, spentOn(nowMs) - wholeSeconds(seconds))
      spent.set(budgetDay(nowMs), next)
      return budgetStatusOf(limitSeconds, next)
    },
    async status(nowMs) {
      return budgetStatusOf(limitSeconds, spentOn(nowMs))
    },
    backend() {
      return "memory"
    },
  }
}

function counted(value: unknown): number {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) {
    throw new UpstreamError(502, "the budget store returned a counter that is not a number")
  }
  return parsed
}

export function createRedisBudget(
  config: RedisRestConfig,
  limitSeconds: number,
  doFetch: FetchLike = fetch,
  scope: string | null = null,
): DailyBudget {
  const client = createRedisRestClient(config, "budget store", doFetch)
  const suffix = scope === null ? "" : `:${scope}`
  const keyOf = (nowMs: number): string => `${BUDGET_KEY_PREFIX}${budgetDay(nowMs)}${suffix}`

  async function change(delta: number, nowMs: number): Promise<number> {
    const key = keyOf(nowMs)
    const [after] = await client.pipeline([
      ["INCRBY", key, String(delta)],
      ["EXPIRE", key, String(BUDGET_KEY_TTL_SECONDS)],
    ])
    return counted(after)
  }

  return {
    async debit(seconds, nowMs): Promise<BudgetDebit> {
      const amount = wholeSeconds(seconds)
      const after = await change(amount, nowMs)
      if (after > limitSeconds) {
        const restored = await change(-amount, nowMs)
        return { granted: false, status: budgetStatusOf(limitSeconds, restored) }
      }
      return { granted: true, status: budgetStatusOf(limitSeconds, after) }
    },
    async refund(seconds, nowMs): Promise<BudgetStatus> {
      const after = await change(-wholeSeconds(seconds), nowMs)
      return budgetStatusOf(limitSeconds, after)
    },
    async status(nowMs) {
      return budgetStatusOf(limitSeconds, counted(await client.command(["GET", keyOf(nowMs)])))
    },
    backend() {
      return "redis"
    },
  }
}

export function chooseDailyBudget(
  env: Record<string, string | undefined>,
  doFetch: FetchLike = fetch,
): DailyBudget {
  const limit = dailyBudgetSeconds(env)
  const config = redisConfigFrom(env)
  if (config !== null) {
    return createRedisBudget(config, limit, doFetch)
  }
  if (!memoryStoreAllowed(env)) {
    throw new SessionStorageError(
      `${sharedStoreNames()} is absent in production; a daily budget counted in one serverless instance would reset with every new instance and cap nothing`,
    )
  }
  return createMemoryBudget(limit)
}

let active: DailyBudget | null = null

export function dailyBudget(): DailyBudget {
  if (active === null) {
    active = chooseDailyBudget(process.env)
  }
  return active
}

export function installDailyBudget(budget: DailyBudget | null): void {
  active = budget
}
