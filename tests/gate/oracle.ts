import {
  ConfirmationMode,
  Criticality,
  type FieldCandidate,
  type FieldPolicy,
  GateAction,
  ReasonCode,
  VerdictOutcome,
} from "@/domain"

export type OracleOutcome = {
  readonly action: GateAction
  readonly reasonCode: ReasonCode
  readonly confirmationMode: ConfirmationMode | null
}

type Rule = {
  readonly name: string
  readonly when: (c: FieldCandidate, p: FieldPolicy) => boolean
  readonly emit: (c: FieldCandidate, p: FieldPolicy) => OracleOutcome
}

function outcome(
  action: GateAction,
  reasonCode: ReasonCode,
  confirmationMode: ConfirmationMode | null = null,
): OracleOutcome {
  return { action, reasonCode, confirmationMode }
}

const OUT_OF_ATTEMPTS: Rule = {
  name: "out of attempts",
  when: (c, p) => c.attempt >= p.maxAttemptsBeforeEscalation,
  emit: (_c, p) =>
    p.criticality === Criticality.Critical
      ? outcome(GateAction.EscalateHuman, ReasonCode.EscalateAfterThirdFailure)
      : outcome(GateAction.AbortField, ReasonCode.AbortNonCritical),
}

const UNDECODABLE: Rule = {
  name: "no normalized value",
  when: (c) => c.normalizedValue === null,
  emit: () => outcome(GateAction.AskConfirm, ReasonCode.NormalizeFailed),
}

const VALIDATOR_FAILURES: Readonly<Record<string, (c: FieldCandidate) => OracleOutcome>> =
  Object.freeze({
    [VerdictOutcome.FailedChecksum]: () =>
      outcome(GateAction.AskSpellOut, ReasonCode.ValidatorChecksum),
    [VerdictOutcome.FormatInvalid]: (c) =>
      c.verdict.validatorName === "schedule_refills"
        ? outcome(GateAction.AskConfirm, ReasonCode.ValidatorFormat)
        : outcome(GateAction.AskSpellOut, ReasonCode.ValidatorFormat),
    [VerdictOutcome.NotInCatalog]: () =>
      outcome(GateAction.AskConfirm, ReasonCode.ValidatorCatalog),
    [VerdictOutcome.InconsistentCombo]: () =>
      outcome(GateAction.AskWhichPart, ReasonCode.ValidatorCombo),
  })

const VALIDATOR_FAILED: Rule = {
  name: "validator rejected the value",
  when: (c) => VALIDATOR_FAILURES[c.verdict.outcome] !== undefined,
  emit: (c) => {
    const rule = VALIDATOR_FAILURES[c.verdict.outcome]
    if (rule === undefined) {
      throw new Error(`the oracle has no failure mapping for ${c.verdict.outcome}`)
    }
    return rule(c)
  },
}

const LASA_MEMBERSHIP: Rule = {
  name: "published look-alike sound-alike pair",
  when: (c, p) => p.lasaChecked && c.lasa.hit,
  emit: () => outcome(GateAction.AskDisambiguate, ReasonCode.LasaHit),
}

const NO_VALIDATOR: Rule = {
  name: "nothing independent can prove this field",
  when: (c) => c.verdict.outcome === VerdictOutcome.NotApplicable,
  emit: () => outcome(GateAction.AskConfirm, ReasonCode.NoValidator, ConfirmationMode.ReadBack),
}

const BELOW_THRESHOLD: Rule = {
  name: "recognizer confidence under the field threshold",
  when: (c, p) => c.provenance.minConfidence < p.autoAcceptThreshold,
  emit: (c, p) =>
    c.attempt >= p.maxAttemptsBeforeSpellout
      ? outcome(GateAction.AskSpellOut, ReasonCode.SpellOutAfterSecondFailure)
      : outcome(GateAction.AskConfirm, ReasonCode.LowConfidence, ConfirmationMode.ReadBack),
}

const READ_BACK_POLICY: Rule = {
  name: "policy demands a read-back for this field",
  when: (_c, p) => p.readBackAlways,
  emit: () =>
    outcome(GateAction.AskConfirm, ReasonCode.ReadBackRequired, ConfirmationMode.ReadBack),
}

const ACCEPT: Rule = {
  name: "proved and confident",
  when: () => true,
  emit: () =>
    outcome(GateAction.Accept, ReasonCode.ValidatorPassedHighConf, ConfirmationMode.Validator),
}

export const ORACLE_RULES: readonly Rule[] = Object.freeze([
  OUT_OF_ATTEMPTS,
  UNDECODABLE,
  VALIDATOR_FAILED,
  LASA_MEMBERSHIP,
  NO_VALIDATOR,
  BELOW_THRESHOLD,
  READ_BACK_POLICY,
  ACCEPT,
])

export function oracleDecide(c: FieldCandidate, p: FieldPolicy): OracleOutcome {
  for (const rule of ORACLE_RULES) {
    if (rule.when(c, p)) {
      return rule.emit(c, p)
    }
  }
  throw new Error("the oracle rule table must be total; ACCEPT is its catch-all")
}

export function firingRuleName(c: FieldCandidate, p: FieldPolicy): string {
  for (const rule of ORACLE_RULES) {
    if (rule.when(c, p)) {
      return rule.name
    }
  }
  throw new Error("the oracle rule table must be total; ACCEPT is its catch-all")
}
