import {
  type BudgetRefusal,
  type BudgetStatus,
  budgetRefusal,
  type DailyBudget,
} from "@/domain"

export type BudgetedMint<T> =
  | { readonly kind: "minted"; readonly value: T; readonly budget: BudgetStatus }
  | { readonly kind: "refused"; readonly refusal: BudgetRefusal }
  | { readonly kind: "failed"; readonly budget: BudgetStatus; readonly error: unknown }

export async function mintWithinBudget<T>(input: {
  budget: DailyBudget
  seconds: number
  nowMs: number
  mint: () => Promise<T | null>
}): Promise<BudgetedMint<T>> {
  const debit = await input.budget.debit(input.seconds, input.nowMs)
  if (!debit.granted) {
    return {
      kind: "refused",
      refusal: budgetRefusal({
        status: debit.status,
        requestedSeconds: input.seconds,
        nowMs: input.nowMs,
        scope: debit.scope,
      }),
    }
  }
  let value: T | null = null
  let error: unknown = null
  try {
    value = await input.mint()
  } catch (caught) {
    error = caught
  }
  if (value === null) {
    const budget = await input.budget.refund(input.seconds, input.nowMs)
    return { kind: "failed", budget, error }
  }
  return { kind: "minted", value, budget: debit.status }
}
