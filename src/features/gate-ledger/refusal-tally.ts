import { GateAction, type GateDecision, ReasonCode } from "@/domain"

export const RefusalReason = {
  BelowThreshold: "below_threshold",
  ValidatorFailed: "validator_failed",
  LasaPair: "lasa_pair",
  PolicyReadBack: "policy_read_back",
  AttemptsExhausted: "attempts_exhausted",
} as const

export type RefusalReason = (typeof RefusalReason)[keyof typeof RefusalReason]

export const THE_THREE_REASONS: readonly RefusalReason[] = [
  RefusalReason.BelowThreshold,
  RefusalReason.ValidatorFailed,
  RefusalReason.LasaPair,
]

export const OTHER_REFUSAL_REASONS: readonly RefusalReason[] = [
  RefusalReason.PolicyReadBack,
  RefusalReason.AttemptsExhausted,
]

export const REASON_OF_CODE: Readonly<Record<ReasonCode, RefusalReason | null>> = Object.freeze(
  {
    [ReasonCode.ValidatorPassedHighConf]: null,
    [ReasonCode.LowConfidence]: RefusalReason.BelowThreshold,
    [ReasonCode.NormalizeFailed]: RefusalReason.ValidatorFailed,
    [ReasonCode.ValidatorChecksum]: RefusalReason.ValidatorFailed,
    [ReasonCode.ValidatorFormat]: RefusalReason.ValidatorFailed,
    [ReasonCode.ValidatorCatalog]: RefusalReason.ValidatorFailed,
    [ReasonCode.ValidatorCombo]: RefusalReason.ValidatorFailed,
    [ReasonCode.LasaHit]: RefusalReason.LasaPair,
    [ReasonCode.ReadBackRequired]: RefusalReason.PolicyReadBack,
    [ReasonCode.NoValidator]: RefusalReason.PolicyReadBack,
    [ReasonCode.SpellOutAfterSecondFailure]: RefusalReason.AttemptsExhausted,
    [ReasonCode.EscalateAfterThirdFailure]: RefusalReason.AttemptsExhausted,
    [ReasonCode.AbortNonCritical]: RefusalReason.AttemptsExhausted,
  },
)

export type RefusalTally = {
  readonly toolCalls: number | null
  readonly confirmed: number | null
  readonly blocked: number | null
  readonly byReason: ReadonlyMap<RefusalReason, number>
  readonly lasaNotBelowThreshold: number | null
}

export const NOTHING_OBSERVED: RefusalTally = Object.freeze({
  toolCalls: null,
  confirmed: null,
  blocked: null,
  byReason: new Map<RefusalReason, number>(),
  lasaNotBelowThreshold: null,
})

function numberEvidence(decision: GateDecision, key: string): number | null {
  const value = decision.evidence[key]
  return typeof value === "number" ? value : null
}

export function tallyRefusals(decisions: readonly GateDecision[]): RefusalTally {
  if (decisions.length === 0) {
    return NOTHING_OBSERVED
  }
  const byReason = new Map<RefusalReason, number>()
  let confirmed = 0
  let blocked = 0
  let lasaNotBelowThreshold = 0
  for (const decision of decisions) {
    if (decision.action === GateAction.Accept) {
      confirmed += 1
      continue
    }
    blocked += 1
    const reason = REASON_OF_CODE[decision.reasonCode]
    if (reason === null) {
      continue
    }
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1)
    if (reason !== RefusalReason.LasaPair) {
      continue
    }
    const certainty = numberEvidence(decision, "minConfidence")
    const threshold = numberEvidence(decision, "threshold")
    if (certainty !== null && threshold !== null && certainty >= threshold) {
      lasaNotBelowThreshold += 1
    }
  }
  return { toolCalls: decisions.length, confirmed, blocked, byReason, lasaNotBelowThreshold }
}

export function countFor(tally: RefusalTally, reason: RefusalReason): number | null {
  if (tally.blocked === null) {
    return null
  }
  return tally.byReason.get(reason) ?? 0
}
