import { createHash } from "node:crypto"
import {
  type BudgetDebit,
  type BudgetScope,
  type BudgetStatus,
  clientShareSeconds,
  type DailyBudget,
  dailyBudgetSeconds,
} from "@/domain"
import { type FetchLike, redisConfigFrom } from "../redis-rest"
import { createMemoryBudget, createRedisBudget, dailyBudget } from "./budget-store"

export const UNATTRIBUTED_CLIENT = "unattributed"

const MAX_MEMORY_CLIENTS = 1024

const CLIENT_KEY_CHARS = 16

export type ScopedBudget = {
  readonly scope: BudgetScope
  readonly budget: DailyBudget
}

export function clientKeyOf(headers: Headers | null | undefined): string {
  const real = headers?.get("x-real-ip")?.trim() ?? ""
  const forwarded = headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
  const address = real.length > 0 ? real : forwarded
  if (address.length === 0) {
    return UNATTRIBUTED_CLIENT
  }
  return createHash("sha256").update(address, "utf8").digest("hex").slice(0, CLIENT_KEY_CHARS)
}

let memoryClients = new Map<string, DailyBudget>()

export function resetClientBudgets(): void {
  memoryClients = new Map()
}

export function clientBudgetFor(
  clientKey: string,
  env: Record<string, string | undefined> = process.env,
  doFetch: FetchLike = fetch,
): DailyBudget {
  const limit = clientShareSeconds(dailyBudgetSeconds(env))
  const config = redisConfigFrom(env)
  if (config !== null) {
    return createRedisBudget(config, limit, doFetch, `client:${clientKey}`)
  }
  const known = memoryClients.get(clientKey)
  if (known !== undefined) {
    return known
  }
  if (memoryClients.size >= MAX_MEMORY_CLIENTS) {
    memoryClients = new Map()
  }
  const created = createMemoryBudget(limit)
  memoryClients.set(clientKey, created)
  return created
}

async function refundAll(
  parts: readonly ScopedBudget[],
  seconds: number,
  nowMs: number,
): Promise<void> {
  for (const part of parts) {
    await part.budget.refund(seconds, nowMs)
  }
}

export function layeredBudget(parts: readonly [ScopedBudget, ...ScopedBudget[]]): DailyBudget {
  const outer = parts[parts.length - 1] ?? parts[0]
  return {
    async debit(seconds, nowMs): Promise<BudgetDebit> {
      const granted: ScopedBudget[] = []
      let status: BudgetStatus | null = null
      for (const part of parts) {
        const debit = await part.budget.debit(seconds, nowMs)
        if (!debit.granted) {
          await refundAll(granted, seconds, nowMs)
          return { granted: false, status: debit.status, scope: part.scope }
        }
        granted.push(part)
        status = debit.status
      }
      return { granted: true, status: status ?? (await outer.budget.status(nowMs)) }
    },
    async refund(seconds, nowMs): Promise<BudgetStatus> {
      await refundAll(parts.slice(0, -1), seconds, nowMs)
      return outer.budget.refund(seconds, nowMs)
    },
    status(nowMs) {
      return outer.budget.status(nowMs)
    },
    backend() {
      return outer.budget.backend()
    },
  }
}

export function budgetForClient(headers: Headers | null | undefined): DailyBudget {
  return layeredBudget([
    { scope: "client", budget: clientBudgetFor(clientKeyOf(headers)) },
    { scope: "daily", budget: dailyBudget() },
  ])
}
