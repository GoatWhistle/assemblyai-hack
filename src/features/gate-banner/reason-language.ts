import { GateAction, ReasonCode } from "@/domain"

export type ReasonSeverity = "accepted" | "asking" | "lasa" | "escalated" | "aborted"

export type ReasonLanguage = {
  readonly code: ReasonCode
  readonly headline: string
  readonly because: string
  readonly severity: ReasonSeverity
}

export const REASON_LANGUAGE: Readonly<Record<ReasonCode, Omit<ReasonLanguage, "code">>> =
  Object.freeze({
    [ReasonCode.ValidatorPassedHighConf]: {
      headline: "Accepted on independent proof",
      because:
        "A validator checked the value against its own rule and passed it, the recognizer was above this field's threshold, no look-alike pair applies, and the field does not demand a spoken read-back.",
      severity: "accepted",
    },
    [ReasonCode.NormalizeFailed]: {
      headline: "Asking again: could not be put into standard form",
      because:
        "The words were heard but no normal form could be derived from them, so there is nothing a validator could check. A phrase like a month's worth has no single numeric value.",
      severity: "asking",
    },
    [ReasonCode.ValidatorChecksum]: {
      headline: "Asking for spell-out: the check digit does not match",
      because:
        "Arithmetic already rejected this value, so repeating it aloud proves nothing. One character is wrong and only a character-by-character reading locates it.",
      severity: "asking",
    },
    [ReasonCode.ValidatorFormat]: {
      headline: "Asking for spell-out: the format is not valid",
      because:
        "The value does not have the shape the field requires, so a check digit cannot even be computed over it.",
      severity: "asking",
    },
    [ReasonCode.ValidatorCatalog]: {
      headline: "Asking again: not in the catalogue",
      because:
        "The name does not exist in the built drug catalogue. Offering a choice between two names would be pointless when the heard name is not a product at all.",
      severity: "asking",
    },
    [ReasonCode.ValidatorCombo]: {
      headline: "Asking which part: the combination does not exist",
      because:
        "Each part may be real on its own, but this drug, strength, form and route tuple is not in the catalogue, so one of the four is wrong and the operator must say which.",
      severity: "asking",
    },
    [ReasonCode.LasaHit]: {
      headline: "Asking to disambiguate: published look-alike pair",
      because:
        "The heard name appears on a regulator-published confused-drug-names list. Recognizer certainty describes acoustics, not which word was actually spoken, so this re-ask fires regardless of confidence, including at 1.00.",
      severity: "lasa",
    },
    [ReasonCode.LowConfidence]: {
      headline: "Asking again: below this field's threshold",
      because:
        "The lowest recognizer certainty across the source words fell under the threshold set for this field. The minimum is used rather than the mean, because a mean hides one bad word inside a good span.",
      severity: "asking",
    },
    [ReasonCode.ReadBackRequired]: {
      headline: "Reading back: this field is always confirmed aloud",
      because:
        "Everything checked out, but the field policy requires a spoken confirmation every time because the cost of a silent error here is a different class of medicine.",
      severity: "asking",
    },
    [ReasonCode.NoValidator]: {
      headline: "Reading back: no validator exists for this field",
      because:
        "There is no checksum and no catalogue that could prove this value, so a spoken confirmation is the only proof available. That is stated rather than dressed up as a pass.",
      severity: "asking",
    },
    [ReasonCode.SpellOutAfterSecondFailure]: {
      headline: "Moving to spell-out after repeated failure",
      because:
        "Plain re-asks have not resolved this field within its attempt budget, so the value is taken one character or one digit at a time.",
      severity: "asking",
    },
    [ReasonCode.EscalateAfterThirdFailure]: {
      headline: "Escalated to a pharmacist",
      because:
        "The attempt budget for a critical field is exhausted. The field stays physically empty, the order is marked as needing a pharmacist, and committing the order is refused.",
      severity: "escalated",
    },
    [ReasonCode.AbortNonCritical]: {
      headline: "Left blank and flagged",
      because:
        "This field is not critical and its attempts are exhausted, so it is left empty for the pharmacy to fill in rather than being guessed at.",
      severity: "aborted",
    },
  })

export function describeReason(code: ReasonCode): ReasonLanguage {
  return { code, ...REASON_LANGUAGE[code] }
}

export const ACTION_LANGUAGE: Readonly<Record<GateAction, string>> = Object.freeze({
  [GateAction.Accept]: "Accept",
  [GateAction.AskConfirm]: "Ask to confirm",
  [GateAction.AskDisambiguate]: "Ask to disambiguate",
  [GateAction.AskWhichPart]: "Ask which part",
  [GateAction.AskSpellOut]: "Ask to spell out",
  [GateAction.EscalateHuman]: "Escalate to a human",
  [GateAction.AbortField]: "Abort the field",
})

export const ALL_REASONS: readonly ReasonLanguage[] = Object.values(ReasonCode).map((code) =>
  describeReason(code),
)
