import { type FieldCandidate, GateAction, type GateDecision, ReasonCode } from "@/domain"

export const GateOutcome = {
  Pass: "PASS",
  ReAsk: "RE-ASK",
  Refused: "REFUSED",
} as const

export type GateOutcome = (typeof GateOutcome)[keyof typeof GateOutcome]

const VALUE_REFUSED: readonly ReasonCode[] = [
  ReasonCode.NormalizeFailed,
  ReasonCode.ValidatorChecksum,
  ReasonCode.ValidatorFormat,
  ReasonCode.ValidatorCatalog,
  ReasonCode.ValidatorCombo,
]

const REFUSING_ACTIONS: readonly GateAction[] = [
  GateAction.EscalateHuman,
  GateAction.AbortField,
]

export function outcomeOf(decision: GateDecision): GateOutcome {
  if (decision.action === GateAction.Accept) {
    return GateOutcome.Pass
  }
  if (
    REFUSING_ACTIONS.includes(decision.action) ||
    VALUE_REFUSED.includes(decision.reasonCode)
  ) {
    return GateOutcome.Refused
  }
  return GateOutcome.ReAsk
}

const GROUND_LABEL: Readonly<Record<ReasonCode, string>> = Object.freeze({
  [ReasonCode.ValidatorPassedHighConf]: "independent proof passed",
  [ReasonCode.NormalizeFailed]: "no standard form",
  [ReasonCode.ValidatorChecksum]: "check digit failed",
  [ReasonCode.ValidatorFormat]: "format invalid",
  [ReasonCode.ValidatorCatalog]: "not in the catalogue",
  [ReasonCode.ValidatorCombo]: "combination not in the catalogue",
  [ReasonCode.LasaHit]: "published look-alike (LASA) pair",
  [ReasonCode.LowConfidence]: "below this field's threshold",
  [ReasonCode.ReadBackRequired]: "field is always read back",
  [ReasonCode.NoValidator]: "no validator exists for this field",
  [ReasonCode.SpellOutAfterSecondFailure]: "second failure, spell-out",
  [ReasonCode.EscalateAfterThirdFailure]: "third failure, pharmacist",
  [ReasonCode.AbortNonCritical]: "non-critical field left blank",
})

export type Signature = {
  readonly heard: string
  readonly certainty: string
  readonly outcome: GateOutcome
  readonly ground: string
  readonly reasonCode: ReasonCode
  readonly candidates: readonly string[]
}

function titleCase(word: string): string {
  return word.length === 0 ? word : `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`
}

function candidatesOf(candidate: FieldCandidate): readonly string[] {
  if (!candidate.lasa.hit) {
    return []
  }
  const names = [...candidate.lasa.confusableWith, candidate.rawValue].map((name) =>
    titleCase(name.trim().toLowerCase()),
  )
  return [...new Set(names)]
}

export function signatureOf(candidate: FieldCandidate, decision: GateDecision): Signature {
  return {
    heard: candidate.rawValue,
    certainty: candidate.provenance.minConfidence.toFixed(2),
    outcome: outcomeOf(decision),
    ground: GROUND_LABEL[decision.reasonCode],
    reasonCode: decision.reasonCode,
    candidates: candidatesOf(candidate),
  }
}
