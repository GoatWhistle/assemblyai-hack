export const ReasonCode = {
  ValidatorPassedHighConf: "A_VALIDATOR_PASSED_HIGH_CONF",
  NormalizeFailed: "E_NORMALIZE_FAILED",
  ValidatorChecksum: "E_VALIDATOR_CHECKSUM",
  ValidatorFormat: "E_VALIDATOR_FORMAT",
  ValidatorCatalog: "E_VALIDATOR_CATALOG",
  ValidatorCombo: "E_VALIDATOR_COMBO",
  LasaHit: "E_LASA_HIT",
  LowConfidence: "E_LOW_CONFIDENCE",
  ReadBackRequired: "E_READ_BACK_REQUIRED",
  NoValidator: "E_NO_VALIDATOR",
  SpellOutAfterSecondFailure: "X_SPELLOUT_AFTER_SECOND_FAILURE",
  EscalateAfterThirdFailure: "X_ESCALATE_AFTER_THIRD_FAILURE",
  AbortNonCritical: "X_ABORT_NON_CRITICAL",
} as const

export type ReasonCode = (typeof ReasonCode)[keyof typeof ReasonCode]

export const REASON_CODES: readonly ReasonCode[] = Object.values(ReasonCode)
