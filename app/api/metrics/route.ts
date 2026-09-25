import { NextResponse } from "next/server"
import type { GateDecision, SessionSummary } from "@/domain"
import {
  ALL_SESSION_ORIGINS,
  buildReport,
  countsTowardPublishedMetrics,
  SESSION_ORIGIN_SEPARATION_NOTE,
  sessionStore,
} from "@/sessions"
import { BENCHMARK_AGREEMENT_NOTE, BENCHMARK_ROWS, BUSINESS_READING } from "@/stats"

export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const store = sessionStore()
  const publishedOrigins = ALL_SESSION_ORIGINS.filter(countsTowardPublishedMetrics)
  const summaries: SessionSummary[] = []
  for (const origin of publishedOrigins) {
    summaries.push(...(await store.list(origin)))
  }

  const decisions: GateDecision[] = []
  for (const summary of summaries) {
    const session = await store.get(summary.sessionId)
    if (session !== null) {
      decisions.push(...session.decisions)
    }
  }

  return NextResponse.json({
    ...buildReport(summaries, decisions),
    storage: store.backend(),
    publishedOrigins,
    originNote: SESSION_ORIGIN_SEPARATION_NOTE,
    benchmark: BENCHMARK_ROWS,
    businessReading: BUSINESS_READING,
    agreementNote: BENCHMARK_AGREEMENT_NOTE,
  })
}
