import type { BudgetStatus } from "./live-contract"

export const DEFAULT_DAILY_BUDGET_SECONDS = 7200

export const MIN_DAILY_BUDGET_SECONDS = 0

export const MAX_DAILY_BUDGET_SECONDS = 86_400

export const BUDGET_EXHAUSTED_CODE = "E_DAILY_BUDGET_EXHAUSTED"

export const BUDGET_UNAVAILABLE_CODE = "E_DAILY_BUDGET_UNAVAILABLE"

export const BUDGET_EXPLANATION =
  "every token this deployment mints is paid from one AssemblyAI account with a fixed credit, so the server debits the token's whole session ceiling in socket seconds from a daily budget before minting it, refunds it when the vendor refuses, and stops minting for the rest of the UTC day once the budget is spent; the recorded replay needs no token and keeps working"

export const CLIENT_SHARE_DIVISOR = 2

export const CLIENT_SHARE_EXPLANATION =
  "one client may spend at most half of the daily socket budget, so a single visitor reloading the live page cannot end live calls for everyone else until the next UTC day; the client is the platform-reported address, hashed, and never stored in clear"

export type BudgetScope = "daily" | "client"

export type BudgetDebit = {
  readonly granted: boolean
  readonly status: BudgetStatus
  readonly scope?: BudgetScope
}

export type DailyBudget = {
  debit(seconds: number, nowMs: number): Promise<BudgetDebit>
  refund(seconds: number, nowMs: number): Promise<BudgetStatus>
  status(nowMs: number): Promise<BudgetStatus>
  backend(): "redis" | "memory"
}

export function dailyBudgetSeconds(env: Record<string, string | undefined>): number {
  const raw = env.READBACK_DAILY_BUDGET_SECONDS
  if (raw === undefined || raw.trim().length === 0) {
    return DEFAULT_DAILY_BUDGET_SECONDS
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_DAILY_BUDGET_SECONDS
  }
  return Math.min(
    MAX_DAILY_BUDGET_SECONDS,
    Math.max(MIN_DAILY_BUDGET_SECONDS, Math.trunc(parsed)),
  )
}

export function clientShareSeconds(dailyLimitSeconds: number): number {
  return Math.ceil(Math.max(0, dailyLimitSeconds) / CLIENT_SHARE_DIVISOR)
}

export function budgetDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10)
}

export function budgetStatusOf(limitSeconds: number, spentSeconds: number): BudgetStatus {
  const remainingSeconds = Math.max(0, limitSeconds - Math.max(0, spentSeconds))
  return Object.freeze({ remainingSeconds, exhausted: remainingSeconds <= 0 })
}

export type BudgetRefusal = {
  readonly error: string
  readonly code: typeof BUDGET_EXHAUSTED_CODE
  readonly budget: BudgetStatus
  readonly requestedSeconds: number
  readonly explanation: string
  readonly resetsAt: string
}

export function budgetRefusal(input: {
  status: BudgetStatus
  requestedSeconds: number
  nowMs: number
  scope?: BudgetScope
}): BudgetRefusal {
  const resetsAt = `${budgetDay(input.nowMs + 86_400_000)}T00:00:00.000Z`
  const client = input.scope === "client"
  const subject = client
    ? "this client's share of the daily socket budget"
    : "the daily socket budget"
  return {
    error: `${subject} has ${input.status.remainingSeconds} seconds left and this token needs ${input.requestedSeconds}, so no token is minted${client ? " for this client" : ""} until ${resetsAt}`,
    code: BUDGET_EXHAUSTED_CODE,
    budget: input.status,
    requestedSeconds: input.requestedSeconds,
    explanation: client ? CLIENT_SHARE_EXPLANATION : BUDGET_EXPLANATION,
    resetsAt,
  }
}
