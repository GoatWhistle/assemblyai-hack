import type {
  CommitRefusalSnapshot,
  ConfirmationEvidence,
  FieldName,
  LiveOrderSnapshot,
  OrderStatus,
} from "@/domain"

export type { LiveOrderSnapshot } from "@/domain"

const ORDER_STATUSES: readonly string[] = [
  "in_progress",
  "needs_pharmacist",
  "committed",
  "abandoned",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function arrayOf<T>(value: unknown): readonly T[] | null {
  return Array.isArray(value) ? (value as T[]) : null
}

export function readSnapshot(raw: unknown): LiveOrderSnapshot | null {
  if (!isRecord(raw)) {
    return null
  }
  if (typeof raw.orderId !== "string" || raw.orderId.length === 0) {
    return null
  }
  if (typeof raw.referenceNumber !== "string") {
    return null
  }
  if (typeof raw.status !== "string" || !ORDER_STATUSES.includes(raw.status)) {
    return null
  }
  const confirmedFields = arrayOf<FieldName>(raw.confirmedFields)
  const abortedFields = arrayOf<FieldName>(raw.abortedFields)
  const confirmations = arrayOf<ConfirmationEvidence>(raw.confirmations)
  const commitRefusals = arrayOf<CommitRefusalSnapshot>(raw.commitRefusals)
  if (
    confirmedFields === null ||
    abortedFields === null ||
    confirmations === null ||
    commitRefusals === null
  ) {
    return null
  }
  const awaiting = isRecord(raw.awaitingConfirmation)
    ? (raw.awaitingConfirmation as LiveOrderSnapshot["awaitingConfirmation"])
    : null
  return {
    orderId: raw.orderId,
    referenceNumber: raw.referenceNumber,
    status: raw.status as OrderStatus,
    confirmedFields,
    abortedFields,
    confirmations,
    commitRefusals,
    awaitingConfirmation: awaiting,
    actualModel: typeof raw.actualModel === "string" ? raw.actualModel : null,
  }
}
