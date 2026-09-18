import { GateAction, type GateDecision } from "@/domain"
import { REASON_OF_CODE, type RefusalReason } from "./refusal-tally"

export type RejectedRow = {
  readonly candidateId: string
  readonly field: GateDecision["field"]
  readonly reasonCode: GateDecision["reasonCode"]
  readonly reason: RefusalReason | null
  readonly agentUtterance: string
  readonly attempt: number | null
}

function attemptOf(decision: GateDecision): number | null {
  const value = decision.evidence.attempt
  return typeof value === "number" ? value : null
}

export function rejectedRows(decisions: readonly GateDecision[]): readonly RejectedRow[] {
  return decisions
    .filter((decision) => decision.action !== GateAction.Accept)
    .map((decision) => ({
      candidateId: decision.candidateId,
      field: decision.field,
      reasonCode: decision.reasonCode,
      reason: REASON_OF_CODE[decision.reasonCode],
      agentUtterance: decision.agentUtterance,
      attempt: attemptOf(decision),
    }))
}

export function rowsForReason(
  rows: readonly RejectedRow[],
  reason: RefusalReason | null,
): readonly RejectedRow[] {
  if (reason === null) {
    return rows
  }
  return rows.filter((row) => row.reason === reason)
}
