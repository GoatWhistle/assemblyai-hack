import { NextResponse } from "next/server"
import { type AgentDeletion, deleteSessionAgent } from "@/agent"
import {
  type OrderReceipt,
  type OrderWitness,
  ReadbackError,
  receiptWithoutDigest,
  sealReceipt,
  UNKNOWN_SESSION_CODE,
  usableSessionId,
} from "@/domain"
import { originFromEnv, sessionOriginOf, sessionStore, witnessOrder } from "@/sessions"
import { loadIntake, receiptOf, removeIntake } from "@/tools"

export const dynamic = "force-dynamic"

export const maxDuration = 30

async function witnessed(
  receipt: OrderReceipt | null,
  witness: OrderWitness,
): Promise<OrderReceipt | null> {
  return receipt === null ? null : sealReceipt({ ...receiptWithoutDigest(receipt), witness })
}

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

  let state: Awaited<ReturnType<typeof loadIntake>>
  try {
    state = await loadIntake(id)
  } catch (error) {
    if (error instanceof ReadbackError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 })
    }
    throw error
  }
  if (state === null) {
    const earlier = await sessionStore().get(id)
    if (earlier !== null) {
      return NextResponse.json({
        sessionId: id,
        alreadyFinalized: true,
        committed: earlier.committed,
        storage: sessionStore().backend(),
        origin: earlier.origin,
      })
    }
    return NextResponse.json(
      { error: `no registered session ${id}`, code: UNKNOWN_SESSION_CODE },
      { status: 404 },
    )
  }

  const origin =
    requestedOrigin === null ? originFromEnv(process.env) : sessionOriginOf(requestedOrigin)
  const store = sessionStore()
  const earlierReceipt = (await store.get(id))?.receipt ?? null
  const stored = {
    sessionId: id,
    startedAt: state.startedAt,
    endedAt: new Date().toISOString(),
    decisions: state.decisions,
    events: state.events,
    closes: [],
    gateEnabled: state.gateEnabled,
    origin,
    orderId: state.order.orderId,
    committed: state.order.status === "committed",
    receipt: earlierReceipt ?? (await receiptOf(state, origin)),
  }

  await store.put(stored)
  await removeIntake(id)

  const key = process.env.ASSEMBLYAI_API_KEY?.trim() ?? ""
  const witness = await witnessOrder({
    apiKey: key.length === 0 ? null : key,
    agentId: state.agentId,
    fields: [...state.order.fields.values()].map(({ field, value }) => ({ field, value })),
    nowIso: new Date().toISOString(),
  })
  await store.put({ ...stored, witness, receipt: await witnessed(stored.receipt, witness) })

  const agentDeletion: AgentDeletion | "no_key" =
    key.length === 0
      ? "no_key"
      : await deleteSessionAgent({ apiKey: key, agentId: state.agentId })

  return NextResponse.json({
    sessionId: id,
    alreadyFinalized: false,
    decisionCount: stored.decisions.length,
    committed: stored.committed,
    storage: store.backend(),
    origin: stored.origin,
    agentId: state.agentId,
    agentDeletion,
    witness,
  })
}
