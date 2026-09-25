import type { OrderReceipt } from "@/domain"
import { buildReceipt } from "@/sessions"
import type { IntakeState } from "./intake"

export async function receiptOf(
  state: IntakeState,
  origin: string,
): Promise<OrderReceipt | null> {
  if (state.order.status !== "committed" || state.committedAtMs === null) {
    return null
  }
  return buildReceipt({
    orderId: state.order.orderId,
    sessionId: state.sessionId,
    fields: [...state.order.fields.values()],
    confirmations: state.confirmations,
    actualModel: state.actualModel,
    origin,
    committedAt: new Date(state.committedAtMs).toISOString(),
  })
}
