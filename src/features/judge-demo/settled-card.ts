import {
  type ConfirmationEvidence,
  ConfirmationReason,
  type FieldCandidate,
  type GateDecision,
} from "@/domain"
import { decide } from "@/gate"
import { type DemoPhase, SHIPPED_EVIDENCE, SHIPPED_POLICY } from "./demo-arms"
import { LASA_CANDIDATE, LASA_DECISION, NAMED_CANDIDATE } from "./scenario"

export type ReplayCard = {
  readonly candidate: FieldCandidate
  readonly decision: GateDecision | null
  readonly siblings: readonly FieldCandidate[]
  readonly evidence: ConfirmationEvidence | null
  readonly decisions: ReadonlyMap<string, GateDecision>
}

export const NAMED_DECISION: GateDecision = decide(NAMED_CANDIDATE, SHIPPED_POLICY)

export const SETTLED_EVIDENCE: ConfirmationEvidence | null =
  SHIPPED_EVIDENCE === null
    ? null
    : Object.freeze({
        ...SHIPPED_EVIDENCE,
        candidateId: NAMED_CANDIDATE.candidateId,
        verdict: "confirmed" as const,
        reasonCode: ConfirmationReason.CallerNamedValue,
      })

const SETTLED: ReplayCard = Object.freeze({
  candidate: NAMED_CANDIDATE,
  decision: NAMED_DECISION,
  siblings: [LASA_CANDIDATE, NAMED_CANDIDATE],
  evidence: SETTLED_EVIDENCE,
  decisions: new Map([
    [LASA_DECISION.candidateId, LASA_DECISION],
    [NAMED_DECISION.candidateId, NAMED_DECISION],
  ]),
})

const UNDECIDED: ReadonlyMap<string, GateDecision> = new Map()

export function settledCard(phase: DemoPhase, decision: GateDecision | null): ReplayCard {
  if (phase === "settled") {
    return SETTLED
  }
  return {
    candidate: LASA_CANDIDATE,
    decision,
    siblings: [],
    evidence: null,
    decisions: decision === null ? UNDECIDED : new Map([[decision.candidateId, decision]]),
  }
}
