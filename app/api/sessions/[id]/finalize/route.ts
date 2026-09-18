import { NextResponse } from "next/server"
import { usableSessionId } from "@/domain"
import { originFromEnv, sessionOriginOf, sessionStore } from "@/sessions"
import { intakeFor, resetIntake } from "@/tools"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: raw } = await context.params
  const requestedOrigin = new URL(request.url).searchParams.get("origin")
  const id = usableSessionId(raw)
  if (id === null) {
    return NextResponse.json({ error: "the session id is not usable" }, { status: 400 })
  }
  const state = intakeFor(id)

  const stored = {
    sessionId: id,
    startedAt: state.startedAt,
    endedAt: new Date().toISOString(),
    decisions: state.decisions,
    events: state.events,
    closes: [],
    gateEnabled: state.gateEnabled,
    origin:
      requestedOrigin === null ? originFromEnv(process.env) : sessionOriginOf(requestedOrigin),
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
    origin: stored.origin,
  })
}
