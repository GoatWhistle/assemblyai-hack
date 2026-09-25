import { type LiveOrderSnapshot, referenceNumberFor } from "@/domain"
import type { IntakeState } from "./intake"

export function orderSnapshot(state: IntakeState): LiveOrderSnapshot {
  const awaiting = state.readBack
  const confirmedFields = [...state.order.fields.keys()]
  return {
    orderId: state.order.orderId,
    referenceNumber: referenceNumberFor(state.order.orderId),
    status: state.order.status,
    confirmedFields,
    abortedFields: [...state.order.abortedFields],
    confirmations: [...state.confirmations.values()],
    commitRefusals: [...state.commitRefusals],
    awaitingConfirmation:
      awaiting === null || awaiting.answered
        ? null
        : {
            field: awaiting.field,
            candidateId: awaiting.candidateId,
            sinceMs: awaiting.sinceMs,
          },
    actualModel: state.actualModel,
  }
}
