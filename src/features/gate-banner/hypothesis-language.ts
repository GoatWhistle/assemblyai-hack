import { ReasonCode } from "@/domain"

export type Stance = {
  readonly claim: string
  readonly notClaim: string
  readonly askedOf: string
}

export const LASA_STANCE: Stance = Object.freeze({
  claim:
    "What is known: this name sits on a published pair of medicines that sound alike. That is a fact about the list, not about the caller.",
  notClaim:
    "What is not known, and what this re-ask does not assert: which of the two the caller said. Nothing here suggests the wrong one was spoken, and most of the time it was not.",
  askedOf:
    "So the caller is asked to confirm, not corrected. The confirmation is the proof the pair makes unavailable any other way.",
})

export const HYPOTHESIS_STANCE: Readonly<Record<ReasonCode, Stance | null>> = Object.freeze({
  [ReasonCode.ValidatorPassedHighConf]: null,
  [ReasonCode.NormalizeFailed]: null,
  [ReasonCode.ValidatorChecksum]: null,
  [ReasonCode.ValidatorFormat]: null,
  [ReasonCode.ValidatorCatalog]: null,
  [ReasonCode.ValidatorCombo]: null,
  [ReasonCode.LasaHit]: LASA_STANCE,
  [ReasonCode.LowConfidence]: Object.freeze({
    claim:
      "What is known: the recognizer's own certainty over these words fell under the threshold this deployment set for the field.",
    notClaim:
      "What is not known: whether the value is wrong. A low reading is a statement about the audio the recognizer received, not a finding against the caller.",
    askedOf:
      "So the value is confirmed aloud rather than rejected. Most values re-asked this way turn out to have been right.",
  }),
  [ReasonCode.ReadBackRequired]: null,
  [ReasonCode.NoValidator]: null,
  [ReasonCode.SpellOutAfterSecondFailure]: null,
  [ReasonCode.EscalateAfterThirdFailure]: null,
  [ReasonCode.AbortNonCritical]: null,
})

export const LASA_NOT_AN_ACCUSATION =
  "A pair hit is a property of a published list, not a judgement about the caller. Most callers asked this question were right the first time, and the question is the price of the one who was not."

export const ACCUSATION_WORDS: readonly string[] = Object.freeze([
  "you said the wrong",
  "misheard you",
  "you are wrong",
  "incorrect drug",
  "error by the caller",
  "mistake",
  "wrong name was spoken",
  "caught",
  "suspicious",
  "violation",
  "misspoke",
  "detected the error",
  "the caller failed",
  "flagged the caller",
  "you meant",
  "you actually said",
  "really said",
  "slipped up",
  "got it wrong",
  "said it wrong",
  "corrected the caller",
  "caller error",
  "user error",
  "operator error",
  "wrong medication was",
  "tried to order",
  "attempted to order",
  "should have said",
  "failed to say",
  "did not say it clearly",
  "spoke unclearly",
  "mumbl",
  "garbled",
  "careless",
  "at fault",
  "blame",
  "culprit",
  "offending",
  "bad input",
  "invalid caller",
  "rejected the caller",
  "denied the caller",
  "caught the caller",
  "caught you",
  "we know you",
  "prove you",
  "justify",
])

export function stanceFor(code: ReasonCode): Stance | null {
  return HYPOTHESIS_STANCE[code]
}
