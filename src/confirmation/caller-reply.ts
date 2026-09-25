import {
  AFFIRMATIONS,
  BACKCHANNELS,
  CORRECTIONS,
  ConfirmationReason,
  type ConfirmationVerdict,
  FILLERS,
  FieldName,
  type FieldName as FieldNameType,
  NEGATIONS,
  replyWords,
} from "@/domain"
import { lasaRiskFor } from "@/lasa"
import { SPOKEN_SALT_SUFFIXES, spokenTokenMatches, spokenValueTokens } from "./reconcile-value"

const FIELD_NAMING_TOKENS: Readonly<Record<FieldNameType, readonly string[]>> = Object.freeze({
  [FieldName.DrugName]: ["drug", "medication", "medicine", "med"],
  [FieldName.Strength]: ["strength", "dose", "dosage", "mg", "mcg", "ml", "unit", "%"],
  [FieldName.DosageForm]: ["form"],
  [FieldName.Route]: ["route"],
  [FieldName.Quantity]: ["quantity", "dispense", "count"],
  [FieldName.Sig]: ["sig", "directions", "instructions"],
  [FieldName.PrescriberNpi]: ["npi"],
  [FieldName.PrescriberDea]: ["dea"],
  [FieldName.PatientName]: ["patient"],
  [FieldName.Refills]: ["refill", "refills"],
  [FieldName.DaysSupply]: ["supply"],
})

export type CallerReplyClass = {
  readonly verdict: ConfirmationVerdict
  readonly reasonCode: ConfirmationReason
  readonly remainder: readonly string[]
}

function outcome(
  verdict: ConfirmationVerdict,
  reasonCode: ConfirmationReason,
  remainder: readonly string[],
): CallerReplyClass {
  return Object.freeze({ verdict, reasonCode, remainder: Object.freeze([...remainder]) })
}

function digitsOf(tokens: readonly string[]): string {
  return tokens.filter((token) => /^\d+$/.test(token)).join("")
}

function repeatMatchesValue(remainder: readonly string[], valueText: string): boolean {
  const spoken = spokenValueTokens(remainder.join(" ")).filter(
    (token) => !SPOKEN_SALT_SUFFIXES.includes(token),
  )
  if (spoken.length === 0) {
    return true
  }
  const value = spokenValueTokens(valueText)
  if (spoken.every((token) => spokenTokenMatches(token, value))) {
    return true
  }
  const allDigits = spoken.every((token) => /^\d+$/.test(token))
  return allDigits && digitsOf(spoken).length > 1 && digitsOf(spoken) === digitsOf(value)
}

type ReplyShape = {
  readonly words: readonly string[]
  readonly refusal: ConfirmationReason | null
  readonly affirmed: boolean
  readonly remainder: readonly string[]
}

function refusalIn(words: readonly string[]): ConfirmationReason | null {
  if (words.some((word) => CORRECTIONS.has(word))) {
    return ConfirmationReason.CallerCorrected
  }
  if (words.some((word) => NEGATIONS.has(word))) {
    return ConfirmationReason.CallerNegated
  }
  return null
}

function shapeOf(text: string): ReplyShape {
  const words = replyWords(text)
  const refusal = refusalIn(words)
  const affirmed = words.some((word) => AFFIRMATIONS.has(word))
  const remainder = words.filter(
    (word) => !AFFIRMATIONS.has(word) && !FILLERS.has(word) && !BACKCHANNELS.has(word),
  )
  return { words, refusal, affirmed, remainder }
}

export type PlainAnswer = "affirmed" | "denied" | "unclear"

export function classifyPlainAnswer(text: string): PlainAnswer {
  const shape = shapeOf(text)
  if (shape.refusal !== null) {
    return "denied"
  }
  return shape.affirmed && shape.remainder.length === 0 ? "affirmed" : "unclear"
}

export function classifyCallerReply(input: {
  text: string
  valueText: string
}): CallerReplyClass {
  const { words, refusal, affirmed, remainder } = shapeOf(input.text)
  if (words.length === 0) {
    return outcome("unclear", ConfirmationReason.CallerUnclear, [])
  }
  if (refusal !== null) {
    return outcome("rejected", refusal, words)
  }
  const repeats = repeatMatchesValue(remainder, input.valueText)
  if (!affirmed) {
    if (remainder.length === 0) {
      return outcome("unclear", ConfirmationReason.CallerBackchannel, remainder)
    }
    const namesNumber = spokenValueTokens(remainder.join(" ")).some((t) => /^\d+$/.test(t))
    if (!repeats && namesNumber) {
      return outcome("rejected", ConfirmationReason.CallerCorrected, remainder)
    }
    return outcome("unclear", ConfirmationReason.CallerUnclear, remainder)
  }
  if (remainder.length === 0 || repeats) {
    return outcome("confirmed", ConfirmationReason.CallerAffirmed, remainder)
  }
  return outcome("rejected", ConfirmationReason.CallerRepeatMismatch, remainder)
}

function namesLasaPartner(text: string, rawValue: string): boolean {
  const partners = lasaRiskFor(rawValue).confusableWith
  const spoken = spokenValueTokens(text)
  return partners.some((partner) =>
    spokenValueTokens(partner)
      .filter((token) => !SPOKEN_SALT_SUFFIXES.includes(token))
      .every((token) => spokenTokenMatches(token, spoken)),
  )
}

export function supersedesField(input: {
  text: string
  field: FieldNameType
  rawValue: string
}): boolean {
  const words = replyWords(input.text)
  const spoken = spokenValueTokens(input.text)
  const naming = FIELD_NAMING_TOKENS[input.field]
  const named = naming.some((token) => words.includes(token) || spoken.includes(token))
  const partner =
    input.field === FieldName.DrugName && namesLasaPartner(input.text, input.rawValue)
  const retracts = words.some((word) => CORRECTIONS.has(word) || NEGATIONS.has(word))
  const restates = repeatMatchesValue(
    words.filter(
      (word) =>
        !FILLERS.has(word) &&
        !AFFIRMATIONS.has(word) &&
        !BACKCHANNELS.has(word) &&
        !naming.includes(word),
    ),
    input.rawValue,
  )
  const mentionsValue = valueMentioned(input.text, input.rawValue)
  if (partner) {
    return true
  }
  if (named) {
    return retracts || !restates
  }
  return retracts && mentionsValue
}

function valueMentioned(text: string, rawValue: string): boolean {
  const spoken = spokenValueTokens(text)
  const value = spokenValueTokens(rawValue).filter(
    (token) => !SPOKEN_SALT_SUFFIXES.includes(token),
  )
  return value.length > 0 && value.some((token) => spokenTokenMatches(token, spoken))
}
