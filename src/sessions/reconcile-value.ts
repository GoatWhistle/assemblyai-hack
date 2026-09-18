import { type FieldName, makeVerdict, type ValidatorVerdict, VerdictOutcome } from "@/domain"
import { consonantSkeleton } from "@/validators"
import { normalizeInteger } from "./normalize-value"
import type { TurnRecord } from "./provenance-match"

const SALT_SUFFIXES: readonly string[] = [
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

const SCALES: Readonly<Record<string, number>> = Object.freeze({
  hundred: 100,
  thousand: 1000,
})

const SKELETON_FLOOR = 4

function pieces(text: string): readonly string[] {
  return text
    .toLowerCase()
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
  const spelled = normalizeInteger(piece)
  return spelled === null ? piece : String(spelled)
}

function composeNumbers(tokens: readonly string[]): readonly string[] {
  const out: string[] = []
  for (const token of tokens) {
    const scale = SCALES[token]
    const previous = out[out.length - 1]
    if (scale !== undefined && previous !== undefined && /^\d+$/.test(previous)) {
      out[out.length - 1] = String(Number(previous) * scale)
      continue
    }
    if (scale !== undefined) {
      out.push(String(scale))
      continue
    }
    if (/^\d+$/.test(token) && previous !== undefined && /^\d+$/.test(previous)) {
      const head = Number(previous)
      const tail = Number(token)
      const hundreds = head >= 100 && head % 100 === 0 && tail > 0 && tail < 100
      const tens = head >= 20 && head < 100 && head % 10 === 0 && tail > 0 && tail < 10
      if (hundreds || tens) {
        out[out.length - 1] = String(head + tail)
        continue
      }
    }
    out.push(token)
  }
  return out
}

function tokensOf(text: string): readonly string[] {
  return composeNumbers(pieces(text).map(canonical))
}

function digitRun(tokens: readonly string[]): string {
  return tokens.filter((token) => /^\d+$/.test(token)).join("")
}

function spokenTextFor(turn: TurnRecord): string {
  const fromWords = turn.words.map((word) => word.text).join(" ")
  return fromWords.trim().length > 0 ? fromWords : turn.transcript
}

function matchesToken(proposed: string, spoken: readonly string[]): boolean {
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
  const spoken = tokensOf(spokenText)
  const spokenDigits = digitRun(spoken)

  const proposed = tokensOf(input.value).filter((token) => !SALT_SUFFIXES.includes(token))

  const unsupported = proposed.filter((token) => {
    if (matchesToken(token, spoken)) {
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
