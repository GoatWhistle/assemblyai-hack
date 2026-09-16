import {
  type ConfirmationMode,
  type ConfirmedValue,
  Criticality,
  type FieldCandidate,
  type FieldPolicy,
  GateAction,
  type GateDecision,
  GateViolationError,
  ReasonCode,
  VerdictOutcome,
} from "@/domain"

const CONFIRMING_ACTIONS: readonly GateAction[] = [
  GateAction.Accept,
  GateAction.AskConfirm,
  GateAction.AskDisambiguate,
  GateAction.AskWhichPart,
  GateAction.AskSpellOut,
]

const PROOF_BEARING_OUTCOMES: readonly VerdictOutcome[] = [
  VerdictOutcome.Passed,
  VerdictOutcome.NotApplicable,
]

export type ConfirmInput = {
  readonly candidate: FieldCandidate
  readonly policy: FieldPolicy
  readonly decision: GateDecision
  readonly confirmationMode: ConfirmationMode
  readonly callerConfirmed: boolean
  readonly confirmedAt?: string
}

function refuse(message: string): never {
  throw new GateViolationError(message)
}

function assertDecisionMatches(input: ConfirmInput): void {
  const { candidate, decision, callerConfirmed } = input

  if (decision.candidateId !== candidate.candidateId) {
    refuse(
      `the decision belongs to candidate ${decision.candidateId}, not ${candidate.candidateId}`,
    )
  }

  if (decision.field !== candidate.field) {
    refuse(`the decision is for ${decision.field}, not ${candidate.field}`)
  }

  if (!CONFIRMING_ACTIONS.includes(decision.action)) {
    refuse(
      `a ${decision.action} decision (${decision.reasonCode}) is terminal without proof and cannot confirm a value`,
    )
  }

  if (decision.action !== GateAction.Accept && !callerConfirmed) {
    refuse(
      `${decision.reasonCode} asked the caller for ${candidate.field}; without an explicit yes there is nothing to confirm`,
    )
  }

  if (
    decision.action === GateAction.Accept &&
    decision.reasonCode !== ReasonCode.ValidatorPassedHighConf
  ) {
    refuse(
      `an accept must carry ${ReasonCode.ValidatorPassedHighConf}, got ${decision.reasonCode}`,
    )
  }
}

function assertValueIsProved(input: ConfirmInput): void {
  const { candidate, policy, callerConfirmed } = input

  if (candidate.normalizedValue === null) {
    refuse(`${candidate.field} has no normalized value, so there is nothing provable to write`)
  }

  if (candidate.provenance.words.length === 0) {
    refuse(
      `${candidate.field} has empty provenance; a value with no source words cannot be confirmed`,
    )
  }

  const validatorProved = PROOF_BEARING_OUTCOMES.includes(candidate.verdict.outcome)

  if (!validatorProved && !callerConfirmed) {
    refuse(
      `${candidate.field} failed its validator (${candidate.verdict.outcome}) and the caller did not confirm it aloud`,
    )
  }

  if (policy.criticality === Criticality.Critical && !validatorProved && !callerConfirmed) {
    refuse(
      `critical field ${candidate.field} has no proof from a validator and none from the caller`,
    )
  }

  if (candidate.verdict.outcome === VerdictOutcome.NotApplicable && !callerConfirmed) {
    refuse(
      `${candidate.field} has no independent validator, so a spoken confirmation is the only proof and it is missing`,
    )
  }
}

export function confirm(input: ConfirmInput): ConfirmedValue {
  const { candidate, confirmationMode } = input

  assertDecisionMatches(input)
  assertValueIsProved(input)

  if (candidate.normalizedValue === null) {
    refuse(`${candidate.field} has no normalized value, so there is nothing provable to write`)
  }

  return Object.freeze({
    field: candidate.field,
    value: candidate.normalizedValue,
    provenance: candidate.provenance,
    verdict: candidate.verdict,
    confirmationMode,
    candidateId: candidate.candidateId,
    confirmedAt: input.confirmedAt ?? new Date().toISOString(),
  }) as ConfirmedValue
}
