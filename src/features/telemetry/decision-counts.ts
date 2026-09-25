import { type FieldCandidate, GateAction, type GateDecision } from "@/domain"
import type { LiveOrderSnapshot } from "@/features/order-summary/live-snapshot"

export type DecisionCounts = {
  readonly proposed: number
  readonly confirmed: number
  readonly refused: number
}

export function countDecisions(input: {
  readonly candidates: readonly FieldCandidate[]
  readonly decisionHistory: readonly GateDecision[]
  readonly snapshot: LiveOrderSnapshot | null
}): DecisionCounts {
  const confirmed =
    input.snapshot === null
      ? input.decisionHistory.filter((decision) => decision.action === GateAction.Accept).length
      : input.snapshot.confirmedFields.length
  const refused = input.decisionHistory.filter(
    (decision) => decision.action !== GateAction.Accept,
  ).length
  return { proposed: input.candidates.length, confirmed, refused }
}
