import { NextResponse } from "next/server"
import { sessionStore } from "@/sessions"
import { intakeFor, resetIntake } from "@/tools"

export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params
  const state = intakeFor(id)

  const stored = {
    sessionId: id,
    startedAt: state.startedAt,
    endedAt: new Date().toISOString(),
    decisions: state.decisions,
    events: state.events,
    closes: [],
    gateEnabled: state.gateEnabled,
    orderId: state.order.orderId,
    committed: state.order.status === "committed",
  }

  const store = sessionStore()
  await store.put(stored)
  resetIntake(id)

  return NextResponse.json({
    sessionId: id,
    decisionCount: stored.decisions.length,
    committed: stored.committed,
    storage: store.backend(),
  })
}
