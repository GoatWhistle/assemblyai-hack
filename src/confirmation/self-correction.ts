import {
  FieldName,
  type FieldName as FieldNameType,
  makeVerdict,
  RETRACTED_VALUE_CODE,
  replyWords,
  type ValidatorVerdict,
  VerdictOutcome,
} from "@/domain"
import type { TurnRecord } from "./provenance-match"
import {
  reconcileValue,
  SPOKEN_SALT_SUFFIXES,
  spokenTokenMatches,
  spokenValueTokens,
  unsupportedValueVerdict,
} from "./reconcile-value"

const CORRECTION_MARKERS: readonly (readonly string[])[] = Object.freeze([
  ["no", "wait"],
  ["sorry"],
  ["i", "mean"],
  ["actually"],
  ["scratch", "that"],
])

const NEGATED_FIRST_MARKER = "not X, Y"

const REPLACEMENT_WINDOW = 4

const NUMERIC_FIELDS: readonly FieldNameType[] = [
  FieldName.Strength,
  FieldName.Quantity,
  FieldName.Refills,
  FieldName.DaysSupply,
  FieldName.PrescriberNpi,
  FieldName.PrescriberDea,
]

export type SameKind = (token: string) => boolean

export type Retraction = {
  readonly marker: string
  readonly retracted: string
  readonly replacement: string
}

type Segment = { readonly tokens: readonly string[]; readonly markerBefore: string | null }

function segmentsOf(text: string): readonly Segment[] {
  const words = replyWords(text)
  const segments: Segment[] = []
  let current: string[] = []
  let markerBefore: string | null = null
  let index = 0
  while (index < words.length) {
    const marker = CORRECTION_MARKERS.find((phrase) =>
      phrase.every((word, offset) => words[index + offset] === word),
    )
    if (marker === undefined) {
      current.push(words[index] ?? "")
      index += 1
      continue
    }
    segments.push({ tokens: spokenValueTokens(current.join(" ")), markerBefore })
    current = []
    markerBefore = marker.join(" ")
    index += marker.length
  }
  segments.push({ tokens: spokenValueTokens(current.join(" ")), markerBefore })
  return segments
}

function isDigits(token: string): boolean {
  return /^\d+$/.test(token)
}

export function sameKindFor(field: FieldNameType, drugName: SameKind | null): SameKind {
  if (NUMERIC_FIELDS.includes(field)) {
    return isDigits
  }
  if (field === FieldName.DrugName && drugName !== null) {
    return drugName
  }
  return () => false
}

function valueAnchor(field: FieldNameType, valueTokens: readonly string[]): string | undefined {
  if (NUMERIC_FIELDS.includes(field)) {
    return valueTokens.find(isDigits) ?? valueTokens[0]
  }
  return valueTokens[0]
}

export function retractionOf(input: {
  value: string
  field: FieldNameType
  text: string
  sameKind: SameKind
}): Retraction | null {
  const valueTokens = spokenValueTokens(input.value).filter(
    (token) => !SPOKEN_SALT_SUFFIXES.includes(token),
  )
  const anchor = valueAnchor(input.field, valueTokens)
  if (anchor === undefined) {
    return null
  }
  const supports = (tokens: readonly string[]): readonly number[] =>
    tokens.flatMap((token, index) => (spokenTokenMatches(anchor, [token]) ? [index] : []))
  const isOther = (token: string): boolean =>
    input.sameKind(token) && !valueTokens.some((value) => spokenTokenMatches(value, [token]))
  const segments = segmentsOf(input.text)
  const last = segments.findLastIndex((segment) => supports(segment.tokens).length > 0)
  const said = segments[last]
  if (said === undefined) {
    return null
  }
  const position = supports(said.tokens).at(-1) ?? 0
  const retracted = said.tokens[position] ?? anchor
  for (const later of segments.slice(last + 1)) {
    const replacement = later.tokens.slice(0, REPLACEMENT_WINDOW).find(isOther)
    if (replacement !== undefined && later.markerBefore !== null) {
      return Object.freeze({ marker: later.markerBefore, retracted, replacement })
    }
  }
  if (said.tokens[position - 1] === "not") {
    const replacement = said.tokens
      .slice(position + 1, position + 1 + REPLACEMENT_WINDOW)
      .find(isOther)
    if (replacement !== undefined) {
      return Object.freeze({ marker: NEGATED_FIRST_MARKER, retracted, replacement })
    }
  }
  return null
}

export function negatedMention(text: string, name: string): boolean {
  const words = replyWords(text)
  const anchor = spokenValueTokens(name).find((token) => !SPOKEN_SALT_SUFFIXES.includes(token))
  if (anchor === undefined) {
    return false
  }
  return words.some(
    (word, index) => spokenTokenMatches(anchor, [word]) && words[index - 1] === "not",
  )
}
function retractedValueVerdict(input: {
  field: FieldNameType
  value: string
  retraction: Retraction
  spokenText: string
}): ValidatorVerdict {
  const field = input.field.replace(/_/g, " ")
  const { marker, retracted, replacement } = input.retraction
  return makeVerdict({
    outcome: VerdictOutcome.InconsistentCombo,
    validatorName: "spoken_support",
    detail: `I have "${input.value}" for the ${field}, but in that turn you said "${retracted}", then "${marker}", then "${replacement}", so the first value was taken back`,
    checkedValue: input.value,
    evidence: {
      supportCode: RETRACTED_VALUE_CODE,
      spokenText: input.spokenText,
      marker,
      retracted,
      replacement,
      supportedByValidator: false,
    },
  })
}

export function spokenSupportVerdict(input: {
  field: FieldNameType
  value: string
  turn: TurnRecord | undefined
  fieldVerdict: ValidatorVerdict
  sameKind: SameKind
}): ValidatorVerdict {
  const { field, value, turn } = input
  if (turn === undefined) {
    return input.fieldVerdict
  }
  const reconciliation = reconcileValue({ value, turn })
  if (!reconciliation.supported) {
    return unsupportedValueVerdict({ field, value, reconciliation })
  }
  const retraction = retractionOf({
    value,
    field,
    text: reconciliation.spokenText,
    sameKind: input.sameKind,
  })
  if (retraction === null) {
    return input.fieldVerdict
  }
  return retractedValueVerdict({
    field,
    value,
    retraction,
    spokenText: reconciliation.spokenText,
  })
}
