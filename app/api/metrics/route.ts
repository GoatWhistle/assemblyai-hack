import { NextResponse } from "next/server"
import type { GateDecision } from "@/domain"
import { buildReport, sessionStore } from "@/sessions"

export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const store = sessionStore()
  const summaries = await store.list()

  const decisions: GateDecision[] = []
  for (const summary of summaries) {
    const session = await store.get(summary.sessionId)
    if (session !== null) {
      decisions.push(...session.decisions)
    }
  }

  return NextResponse.json({ ...buildReport(summaries, decisions), storage: store.backend() })
}
