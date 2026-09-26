import { type FieldName, makeVerdict, type ValidatorVerdict, VerdictOutcome } from "@/domain"
import { consonantSkeleton } from "@/validators"
import { normalizeInteger } from "./normalize-value"
import type { TurnRecord } from "./provenance-match"
import { collapseThousandsSeparators, composeSpokenNumbers, isScaleWord } from "./spoken-number"

export const SPOKEN_SALT_SUFFIXES: readonly string[] = [
  "hydrochloride",
  "hydrobromide",
  "hydrate",
  "sulfate",
  "sulphate",
  "sodium",
  "potassium",
  "calcium",
  "magnesium",
  "tartrate",
  "maleate",
  "mesylate",
  "besylate",
  "succinate",
  "fumarate",
  "citrate",
  "acetate",
  "phosphate",
  "bitartrate",
  "tromethamine",
  "hcl",
]

const UNIT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  milligram: "mg",
  milligrams: "mg",
  mg: "mg",
  microgram: "mcg",
  micrograms: "mcg",
  mcg: "mcg",
  gram: "g",
  grams: "g",
  g: "g",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  ml: "ml",
  unit: "unit",
  units: "unit",
  percent: "%",
  tablet: "tablet",
  tablets: "tablet",
  capsule: "capsule",
  capsules: "capsule",
})

const SKELETON_FLOOR = 4

function pieces(text: string): readonly string[] {
  return collapseThousandsSeparators(text.toLowerCase())
    .replace(/\//g, " per ")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .split(" ")
    .filter((piece) => piece.length > 0)
}

function canonical(piece: string): string {
  const alias = UNIT_ALIASES[piece]
  if (alias !== undefined) {
    return alias
  }
  if (isScaleWord(piece)) {
    return piece
  }
  const spelled = normalizeInteger(piece)
  return spelled === null ? piece : String(spelled)
}

export function spokenValueTokens(text: string): readonly string[] {
  return composeSpokenNumbers(pieces(text).map(canonical))
}

function digitRun(tokens: readonly string[]): string {
  return tokens.filter((token) => /^\d+$/.test(token)).join("")
}

function spokenTextFor(turn: TurnRecord): string {
  const fromWords = turn.words.map((word) => word.text).join(" ")
  return fromWords.trim().length > 0 ? fromWords : turn.transcript
}

export function spokenTokenMatches(proposed: string, spoken: readonly string[]): boolean {
  if (spoken.includes(proposed)) {
    return true
  }
  if (proposed.length < SKELETON_FLOOR) {
    return false
  }
  const skeleton = consonantSkeleton(proposed)
  if (skeleton.length < SKELETON_FLOOR) {
    return false
  }
  return spoken.some((token) => consonantSkeleton(token) === skeleton)
}

export type ValueReconciliation = {
  readonly supported: boolean
  readonly proposedTokens: readonly string[]
  readonly unsupportedTokens: readonly string[]
  readonly spokenText: string
}

export function reconcileValue(input: {
  value: string
  turn: TurnRecord
}): ValueReconciliation {
  const spokenText = spokenTextFor(input.turn)
  const spoken = spokenValueTokens(spokenText)
  const spokenDigits = digitRun(spoken)

  const proposed = spokenValueTokens(input.value).filter(
    (token) => !SPOKEN_SALT_SUFFIXES.includes(token),
  )

  const unsupported = proposed.filter((token) => {
    if (spokenTokenMatches(token, spoken)) {
      return false
    }
    return !(/^\d+$/.test(token) && spokenDigits.includes(token))
  })

  return Object.freeze({
    supported: proposed.length > 0 && unsupported.length === 0,
    proposedTokens: Object.freeze(proposed),
    unsupportedTokens: Object.freeze(unsupported),
    spokenText,
  })
}

export function unsupportedValueVerdict(input: {
  field: FieldName
  value: string
  reconciliation: ValueReconciliation
}): ValidatorVerdict {
  const missing = input.reconciliation.unsupportedTokens.join(", ")
  const spoken = input.reconciliation.spokenText
  const field = input.field.replace(/_/g, " ")
  return makeVerdict({
    outcome: VerdictOutcome.InconsistentCombo,
    validatorName: "spoken_support",
    detail: `I have "${input.value}" written down for the ${field}, but what I heard in that turn was "${spoken}", and nothing there accounts for ${missing.length === 0 ? "the value" : missing}`,
    checkedValue: input.value,
    evidence: {
      spokenText: spoken,
      unsupportedTokens: missing,
      proposedTokens: input.reconciliation.proposedTokens.join(", "),
      supportedByValidator: false,
    },
  })
}
