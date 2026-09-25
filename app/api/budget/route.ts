import { NextResponse } from "next/server"
import {
  BUDGET_EXPLANATION,
  BUDGET_UNAVAILABLE_CODE,
  budgetDay,
  dailyBudgetSeconds,
  ReadbackError,
} from "@/domain"
import { dailyBudget } from "@/sessions"

export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const nowMs = Date.now()
  try {
    const budget = dailyBudget()
    const status = await budget.status(nowMs)
    return NextResponse.json(
      {
        budget: status,
        limitSeconds: dailyBudgetSeconds(process.env),
        day: budgetDay(nowMs),
        backend: budget.backend(),
        explanation: BUDGET_EXPLANATION,
      },
      { headers: { "cache-control": "no-store" } },
    )
  } catch (error) {
    if (error instanceof ReadbackError) {
      return NextResponse.json(
        { error: "the daily budget could not be read", code: BUDGET_UNAVAILABLE_CODE },
        { status: 503 },
      )
    }
    throw error
  }
}
