import {
  ConfirmationMode,
  Criticality,
  type DecisionEvidence,
  type FieldCandidate,
  type FieldPolicy,
  GateAction,
  type GateDecision,
  ReasonCode,
  VerdictOutcome,
} from "@/domain"
import {
  abortUtterance,
  acceptUtterance,
  catalogUtterance,
  checksumUtterance,
  comboUtterance,
  escalateUtterance,
  lasaUtterance,
  lowConfidenceUtterance,
  normalizeFailedUtterance,
  noValidatorUtterance,
  readBackUtterance,
  ruleForbidsUtterance,
  spellOutUtterance,
} from "./utterance"

type Emit = (input: {
  action: GateAction
  reasonCode: ReasonCode
  agentUtterance: string
  confirmationMode?: ConfirmationMode
  extra?: DecisionEvidence
}) => GateDecision

function baseEvidence(c: FieldCandidate, policy: FieldPolicy): DecisionEvidence {
  return {
    minConfidence: c.provenance.minConfidence,
    meanConfidence: c.provenance.meanConfidence,
    threshold: policy.autoAcceptThreshold,
    outcome: c.verdict.outcome,
    ruleCited: c.verdict.ruleCited,
    attempt: c.attempt,
    spanMs: [c.provenance.startMs, c.provenance.endMs],
  }
}

function emitter(c: FieldCandidate, policy: FieldPolicy): Emit {
  const evidence = baseEvidence(c, policy)
  return (input) =>
    Object.freeze({
      action: input.action,
      reasonCode: input.reasonCode,
      field: c.field,
      candidateId: c.candidateId,
      agentUtterance: input.agentUtterance,
      evidence: Object.freeze({ ...evidence, ...(input.extra ?? {}) }),
      confirmationMode: input.confirmationMode ?? null,
    })
}

export function decide(c: FieldCandidate, policy: FieldPolicy): GateDecision {
  const d = emitter(c, policy)

  if (c.attempt >= policy.maxAttemptsBeforeEscalation) {
    if (policy.criticality === Criticality.Critical) {
      return d({
        action: GateAction.EscalateHuman,
        reasonCode: ReasonCode.EscalateAfterThirdFailure,
        agentUtterance: escalateUtterance(),
      })
    }
    return d({
      action: GateAction.AbortField,
      reasonCode: ReasonCode.AbortNonCritical,
      agentUtterance: abortUtterance(c.field),
    })
  }

  if (c.normalizedValue === null) {
    return d({
      action: GateAction.AskConfirm,
      reasonCode: ReasonCode.NormalizeFailed,
      agentUtterance: normalizeFailedUtterance(c),
      extra: { rawValue: c.rawValue },
    })
  }

  switch (c.verdict.outcome) {
    case VerdictOutcome.FailedChecksum:
      return d({
        action: GateAction.AskSpellOut,
        reasonCode: ReasonCode.ValidatorChecksum,
        agentUtterance: checksumUtterance(c.field, c.normalizedValue, policy),
        extra: { failedValue: String(c.normalizedValue) },
      })
    case VerdictOutcome.FormatInvalid:
      if (c.verdict.validatorName === "schedule_refills") {
        return d({
          action: GateAction.AskConfirm,
          reasonCode: ReasonCode.ValidatorFormat,
          agentUtterance: ruleForbidsUtterance(c.field, c.verdict.detail),
          extra: { failedValue: String(c.normalizedValue), ruleCited: c.verdict.ruleCited },
        })
      }
      return d({
        action: GateAction.AskSpellOut,
        reasonCode: ReasonCode.ValidatorFormat,
        agentUtterance: checksumUtterance(c.field, c.normalizedValue, policy),
        extra: { failedValue: String(c.normalizedValue) },
      })
    case VerdictOutcome.NotInCatalog:
      return d({
        action: GateAction.AskConfirm,
        reasonCode: ReasonCode.ValidatorCatalog,
        agentUtterance: catalogUtterance(c),
        extra: { failedValue: c.rawValue },
      })
    case VerdictOutcome.InconsistentCombo:
      return d({
        action: GateAction.AskWhichPart,
        reasonCode: ReasonCode.ValidatorCombo,
        agentUtterance: comboUtterance(c.verdict.detail),
        extra: { ...c.verdict.evidence },
      })
    default:
      break
  }

  if (policy.lasaChecked && c.lasa.hit) {
    return d({
      action: GateAction.AskDisambiguate,
      reasonCode: ReasonCode.LasaHit,
      agentUtterance: lasaUtterance(c.lasa),
      extra: {
        lasaSource: c.lasa.source,
        lasaSourceRow: c.lasa.sourceRow,
        confusableWith: [...c.lasa.confusableWith],
        note: "asked regardless of confidence by design",
      },
    })
  }

  switch (c.verdict.outcome) {
    case VerdictOutcome.NotApplicable:
      return d({
        action: GateAction.AskConfirm,
        reasonCode: ReasonCode.NoValidator,
        agentUtterance: noValidatorUtterance(c.field, c.normalizedValue),
        confirmationMode: ConfirmationMode.ReadBack,
      })
    default:
      break
  }

  if (c.provenance.minConfidence < policy.autoAcceptThreshold) {
    if (c.attempt >= policy.maxAttemptsBeforeSpellout) {
      return d({
        action: GateAction.AskSpellOut,
        reasonCode: ReasonCode.SpellOutAfterSecondFailure,
        agentUtterance: spellOutUtterance(c.field, policy),
      })
    }
    return d({
      action: GateAction.AskConfirm,
      reasonCode: ReasonCode.LowConfidence,
      agentUtterance: lowConfidenceUtterance(c.field, c.normalizedValue),
      confirmationMode: ConfirmationMode.ReadBack,
    })
  }

  if (policy.readBackAlways) {
    return d({
      action: GateAction.AskConfirm,
      reasonCode: ReasonCode.ReadBackRequired,
      agentUtterance: readBackUtterance(c.field, c.normalizedValue),
      confirmationMode: ConfirmationMode.ReadBack,
    })
  }

  return d({
    action: GateAction.Accept,
    reasonCode: ReasonCode.ValidatorPassedHighConf,
    agentUtterance: acceptUtterance(c.field, c.normalizedValue),
    confirmationMode: ConfirmationMode.Validator,
  })
}
