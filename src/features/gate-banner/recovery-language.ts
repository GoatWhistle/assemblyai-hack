import { ReasonCode } from "@/domain"

export type RecoveryStep = {
  readonly label: string
  readonly detail: string
}

export const RECOVERY_STEP: Readonly<Record<ReasonCode, RecoveryStep | null>> = Object.freeze({
  [ReasonCode.ValidatorPassedHighConf]: null,
  [ReasonCode.NormalizeFailed]: {
    label: "Say the value again in a plain form",
    detail:
      "A number or a date spoken as a phrase has no single normal form yet. State it plainly, such as a digit count or a calendar date.",
  },
  [ReasonCode.ValidatorChecksum]: {
    label: "Spell it out, one character at a time",
    detail:
      "The check digit already rejected this value, so the recovery is a character-by-character reading, not a repeat of the whole number.",
  },
  [ReasonCode.ValidatorFormat]: {
    label: "Spell it out, one character at a time",
    detail:
      "The shape does not match what this field requires, so the agent asks for it character by character rather than as one spoken block.",
  },
  [ReasonCode.ValidatorCatalog]: {
    label: "Say the drug name again",
    detail:
      "The heard name is not in the built catalogue at all, so the recovery is a fresh utterance rather than a choice between two names.",
  },
  [ReasonCode.ValidatorCombo]: {
    label: "Say which part was wrong",
    detail:
      "Each part passed on its own, but the combination does not exist in the catalogue. The agent asks which single part to correct.",
  },
  [ReasonCode.LasaHit]: {
    label: "Answer which of the two names you said",
    detail:
      "The agent names both drugs from the published pair and waits for you to pick one aloud. Nothing is written until you answer.",
  },
  [ReasonCode.LowConfidence]: {
    label: "Confirm the value aloud",
    detail:
      "The recognizer's own certainty fell under this field's threshold, so a spoken confirmation is the next and only proof.",
  },
  [ReasonCode.ReadBackRequired]: {
    label: "Confirm the value aloud",
    detail:
      "This field is always read back regardless of certainty, so the recovery is the same spoken yes or no every time.",
  },
  [ReasonCode.NoValidator]: {
    label: "Confirm the value aloud",
    detail:
      "No checksum and no catalogue exist for this field, so your spoken confirmation is the only proof that can ever exist here.",
  },
  [ReasonCode.SpellOutAfterSecondFailure]: {
    label: "Spell it out, one character at a time",
    detail:
      "Two plain re-asks did not resolve this field, so the agent now asks for it one character or one digit at a time.",
  },
  [ReasonCode.EscalateAfterThirdFailure]: {
    label: "A pharmacist finishes this field",
    detail:
      "The attempt budget for a critical field is spent. The field stays empty and the order is marked as needing a pharmacist before it can be committed.",
  },
  [ReasonCode.AbortNonCritical]: {
    label: "Left blank for the pharmacy to fill in",
    detail:
      "This field is not critical and its attempts are spent, so it is left empty rather than guessed at. The order can still be committed.",
  },
})
