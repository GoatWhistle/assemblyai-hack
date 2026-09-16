import {
  CandidateStatus,
  type FieldCandidate,
  GateAction,
  type GateDecision,
  ReasonCode,
} from "@/domain"
import type { ChipTone } from "@/shared/ui/primitives/chip"

export type FieldStance = "proposed" | "asking" | "lasa" | "accepted" | "escalated" | "aborted"

export const STANCE_LABEL: Readonly<Record<FieldStance, string>> = Object.freeze({
  proposed: "Proposed, not yet decided",
  asking: "Re-ask in flight",
  lasa: "Mandatory re-ask: look-alike pair",
  accepted: "In the order",
  escalated: "Escalated, field stays empty",
  aborted: "Left blank and flagged",
})

export const STANCE_CHIP: Readonly<Record<FieldStance, ChipTone>> = Object.freeze({
  proposed: "neutral",
  asking: "asking",
  lasa: "lasa",
  accepted: "accepted",
  escalated: "escalated",
  aborted: "aborted",
})

export function stanceOf(
  candidate: FieldCandidate,
  decision: GateDecision | null,
): FieldStance {
  if (decision === null) {
    return candidate.status === CandidateStatus.Proposed ? "proposed" : "asking"
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
  return "asking"
}

export function isConfidenceOverruled(decision: GateDecision | null): boolean {
  return decision !== null && decision.reasonCode === ReasonCode.LasaHit
}

export function confidenceRankNote(stance: FieldStance, aboveThreshold: boolean): string {
  if (stance === "lasa") {
    return aboveThreshold
      ? "Reading order on this card: the published pair decides, and it decided against a recognizer that was above threshold."
      : "Reading order on this card: the published pair decides; the recognizer was below threshold as well."
  }
  if (stance === "accepted") {
    return "Reading order on this card: the validator proved it first, and the recognizer agreed."
  }
  return "Reading order on this card: proof comes first, the recognizer's own certainty second."
}
