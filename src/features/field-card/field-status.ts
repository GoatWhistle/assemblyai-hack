import {
  type ConfirmationEvidence,
  ConfirmationReason,
  type FieldCandidate,
  GateAction,
  type GateDecision,
  ReasonCode,
} from "@/domain"
import type { Status } from "@/shared/ui/primitives/status-chip"

export type FieldStance =
  | "proposed"
  | "asking"
  | "refused"
  | "lasa"
  | "accepted"
  | "confirmed"
  | "escalated"
  | "aborted"

export const STANCE_LABEL: Readonly<Record<FieldStance, string>> = Object.freeze({
  proposed: "Not yet decided by the gate",
  asking: "Re-ask in flight",
  refused: "Refused by its check, asking again",
  lasa: "Confirm aloud: look-alike pair",
  accepted: "In the order",
  confirmed: "In the order, confirmed aloud",
  escalated: "Escalated, field stays empty",
  aborted: "Left blank and flagged",
})

export const STANCE_STATUS: Readonly<Record<FieldStance, Status>> = Object.freeze({
  proposed: "pending",
  asking: "asking",
  refused: "refused",
  lasa: "pair",
  accepted: "written",
  confirmed: "written",
  escalated: "alert",
  aborted: "inactive",
})

export type ValueMark = "written" | "heldLasa" | "heldAsking" | "heldRefused"

export const STANCE_MARK: Readonly<Record<FieldStance, ValueMark | null>> = Object.freeze({
  proposed: null,
  asking: "heldAsking",
  refused: "heldRefused",
  lasa: "heldLasa",
  accepted: "written",
  confirmed: "written",
  escalated: "heldRefused",
  aborted: null,
})

const VALUE_REFUSED: readonly ReasonCode[] = [
  ReasonCode.NormalizeFailed,
  ReasonCode.ValidatorChecksum,
  ReasonCode.ValidatorFormat,
  ReasonCode.ValidatorCatalog,
  ReasonCode.ValidatorCombo,
]

export function confirmsCandidate(
  candidate: FieldCandidate,
  evidence: ConfirmationEvidence | null,
): boolean {
  return (
    evidence !== null &&
    evidence.candidateId === candidate.candidateId &&
    evidence.verdict === "confirmed"
  )
}

export function stanceOf(
  candidate: FieldCandidate,
  decision: GateDecision | null,
  evidence: ConfirmationEvidence | null = null,
): FieldStance {
  if (decision === null) {
    return "proposed"
  }
  if (confirmsCandidate(candidate, evidence)) {
    return "confirmed"
  }
  if (decision.reasonCode === ReasonCode.LasaHit) {
    return "lasa"
  }
  if (decision.action === GateAction.Accept) {
    return "accepted"
  }
  if (decision.action === GateAction.EscalateHuman) {
    return "escalated"
  }
  if (decision.action === GateAction.AbortField) {
    return "aborted"
  }
  return VALUE_REFUSED.includes(decision.reasonCode) ? "refused" : "asking"
}

export function isConfidenceOverruled(
  decision: GateDecision | null,
  candidate: FieldCandidate | null = null,
): boolean {
  if (decision === null) {
    return candidate?.lasa.hit === true
  }
  return decision.reasonCode === ReasonCode.LasaHit
}

export function overruledNote(decision: GateDecision | null): string {
  return decision === null
    ? "This name is on a published look-alike list, so this number will not decide it. The gate has not decided yet."
    : "Outranked on this field by a published look-alike pair. This number is not what decides here."
}

export function confidenceRankNote(stance: FieldStance, aboveThreshold: boolean): string {
  if (stance === "lasa") {
    return aboveThreshold
      ? "The published pair decides this field, even though the recognizer was above threshold."
      : "The published pair decides this field; the recognizer was below threshold as well."
  }
  if (stance === "confirmed") {
    return "The validator proved the value exists and the caller's spoken confirmation settled it; the recognizer's certainty ranks last."
  }
  if (stance === "accepted") {
    return "The validator proved it first; the recognizer agreed."
  }
  return "Proof decides first; the recognizer's own certainty comes second."
}

export type NameAnswerState = "pending" | "yes-refused" | "named"

export function nameAnswerState(evidence: ConfirmationEvidence | null): NameAnswerState {
  if (evidence === null || evidence.verdict === "unclear") {
    return evidence?.reasonCode === ConfirmationReason.LasaNamedAnswerRequired
      ? "yes-refused"
      : "pending"
  }
  return "named"
}
