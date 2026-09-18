import {
  type ConfirmationMode,
  EmptyProvenanceError,
  type FieldCandidate,
  FieldName,
  GateAction,
  type GateDecision,
  GateViolationError,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  type ReasonCode,
  VerdictOutcome,
} from "@/domain"
import { policyFor } from "@/domain/policy"
import { confirm, decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import { ATTACKS, AttackId } from "./attack-list"
import { decisionFor, proofCandidateFor } from "./proof-attacks"

export { AttackId, ATTACKS }

export type AttackOutcome = {
  readonly id: AttackId
  readonly written: boolean
  readonly refusal: string | null
  readonly reasonCode: ReasonCode | null
  readonly ruleCited?: string
  readonly askedFor?: string
}

const SESSION = "attack-console"

function wordsFor(text: string, confidence: number) {
  return [makeWordSpan({ text, startMs: 1000, endMs: 1600, confidence })]
}

function candidateFor(input: {
  readonly value: string
  readonly confidence: number
  readonly outcome: VerdictOutcome
  readonly withWords: boolean
}): FieldCandidate {
  return makeCandidate({
    candidateId: `attack-${input.value}`,
    field: FieldName.DrugName,
    rawValue: input.value,
    normalizedValue: input.value,
    provenance: makeProvenance({
      words: input.withWords ? wordsFor(input.value, input.confidence) : [],
      turnOrder: 1,
      transcriptSlice: input.value,
      sessionId: SESSION,
    }),
    verdict: makeVerdict({
      outcome: input.outcome,
      validatorName: "ndc_catalog",
      detail:
        input.outcome === VerdictOutcome.Passed
          ? `"${input.value}" exists in the built catalogue`
          : `"${input.value}" is not in the built catalogue`,
      checkedValue: input.value,
      evidence: { hasCheckDigit: false },
    }),
    lasa: lasaRiskFor(input.value),
    attempt: 1,
  })
}

function attempt(
  candidate: FieldCandidate,
  decision: GateDecision,
  callerConfirmed: boolean,
  confirmationMode: ConfirmationMode,
  thresholdOverride?: number,
): { readonly written: boolean; readonly refusal: string | null } {
  const base = policyFor(candidate.field)
  const policy =
    thresholdOverride === undefined ? base : { ...base, autoAcceptThreshold: thresholdOverride }
  try {
    confirm({ candidate, policy, decision, confirmationMode, callerConfirmed })
    return { written: true, refusal: null }
  } catch (error) {
    if (error instanceof GateViolationError) {
      return { written: false, refusal: error.message }
    }
    throw error
  }
}

export function runAttack(id: AttackId, confirmationMode: ConfirmationMode): AttackOutcome {
  const policy = policyFor(FieldName.DrugName)

  const proof = proofCandidateFor(id)
  if (proof !== null) {
    const decision = decisionFor(proof)
    const result = attempt(proof, decision, false, confirmationMode)
    return {
      id,
      ...result,
      reasonCode: decision.reasonCode,
      ruleCited: proof.verdict.ruleCited,
      askedFor: decision.agentUtterance,
    }
  }

  if (id === AttackId.ThresholdToZero) {
    const candidate = candidateFor({
      value: "bisoprolol",
      confidence: 1,
      outcome: VerdictOutcome.Passed,
      withWords: true,
    })
    const decision = decide(candidate, { ...policy, autoAcceptThreshold: 0 })
    const result = attempt(candidate, decision, false, confirmationMode, 0)
    return { id, ...result, reasonCode: decision.reasonCode }
  }

  if (id === AttackId.ClaimConfirmation) {
    const candidate = candidateFor({
      value: "bisoprolol",
      confidence: 1,
      outcome: VerdictOutcome.Passed,
      withWords: true,
    })
    const decision = decide(candidate, policy)
    const forged: GateDecision = { ...decision, action: GateAction.Accept }
    const result = attempt(candidate, forged, true, confirmationMode)
    return { id, ...result, reasonCode: decision.reasonCode }
  }

  if (id === AttackId.FailedValidator) {
    const candidate = candidateFor({
      value: "amoxicilin",
      confidence: 0.99,
      outcome: VerdictOutcome.NotInCatalog,
      withWords: true,
    })
    const decision = decide(candidate, policy)
    const result = attempt(candidate, decision, false, confirmationMode)
    return { id, ...result, reasonCode: decision.reasonCode }
  }

  if (id === AttackId.EmptyProvenance) {
    try {
      const candidate = candidateFor({
        value: "amoxicillin",
        confidence: 1,
        outcome: VerdictOutcome.Passed,
        withWords: false,
      })
      const decision = decide(candidate, policy)
      const result = attempt(candidate, decision, true, confirmationMode)
      return { id, ...result, reasonCode: decision.reasonCode }
    } catch (error) {
      if (error instanceof EmptyProvenanceError) {
        return { id, written: false, refusal: error.message, reasonCode: null }
      }
      throw error
    }
  }

  const mine = candidateFor({
    value: "amoxicillin",
    confidence: 1,
    outcome: VerdictOutcome.Passed,
    withWords: true,
  })
  const other = candidateFor({
    value: "metformin",
    confidence: 1,
    outcome: VerdictOutcome.Passed,
    withWords: true,
  })
  const borrowed = decide(other, policy)
  const result = attempt(mine, borrowed, true, confirmationMode)
  return { id, ...result, reasonCode: borrowed.reasonCode }
}
