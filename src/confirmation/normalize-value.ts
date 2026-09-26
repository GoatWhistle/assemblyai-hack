import { FieldName, type NormalizedValue } from "@/domain"
import { normalizeDea, normalizeNpi } from "@/validators"
import { collapseThousandsSeparators, composeSpokenNumbers, isScaleWord } from "./spoken-number"

const NUMBER_WORDS: Readonly<Record<string, number>> = Object.freeze({
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  none: 0,
})

const UNIT_WORDS: Readonly<Record<string, string>> = Object.freeze({
  milligram: "mg",
  milligrams: "mg",
  mg: "mg",
  microgram: "mcg",
  micrograms: "mcg",
  mcg: "mcg",
  gram: "g",
  grams: "g",
  g: "g",
  milliliter: "mL",
  milliliters: "mL",
  ml: "mL",
  unit: "unit",
  units: "unit",
  percent: "%",
})

export function normalizeInteger(raw: string): number | null {
  const text = collapseThousandsSeparators(raw.trim().toLowerCase())
  const direct = text.match(/^-?\d+$/)
  if (direct !== null) {
    return Number(text)
  }
  if (/^no\s+refills?$/.test(text) || text === "none" || text === "no") {
    return 0
  }
  const tokens = text.split(/[\s-]+/).filter((t) => t.length > 0 && t !== "and")
  const mapped: string[] = []
  for (const token of tokens) {
    const value = NUMBER_WORDS[token]
    if (value !== undefined) {
      mapped.push(String(value))
    } else if (isScaleWord(token) || /^\d+$/.test(token)) {
      mapped.push(token)
    } else {
      return null
    }
  }
  if (mapped.length === 0) {
    return null
  }
  if (mapped.every((token) => /^\d+$/.test(token) && Number(token) < 20)) {
    return mapped.reduce((total, token) => total + Number(token), 0)
  }
  const composed = composeSpokenNumbers(mapped)
  return composed.length === 1 && /^\d+$/.test(String(composed[0])) ? Number(composed[0]) : null
}

function strengthPerUnit(text: string): string | null {
  const match = text.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)\s*\/\s*(\d*)\s*([a-z]*)$/)
  if (match === null) {
    return null
  }
  const unit = UNIT_WORDS[String(match[2])] ?? match[2]
  const denominator = String(match[3] ?? "")
  const denominatorUnit = String(match[4] ?? "")
  if (denominator === "1" && denominatorUnit.length === 0) {
    return `${match[1]} ${unit}`
  }
  return `${match[1]} ${unit}/${denominator}${denominatorUnit}`
}

function strengthNumeric(text: string): string | null {
  const match = text.match(/^(\d+(?:\.\d+)?)\s*([a-z%]+)$/)
  if (match === null) {
    return null
  }
  const unit = UNIT_WORDS[String(match[2])] ?? match[2]
  return `${match[1]} ${unit}`
}

function strengthSpelled(text: string): string | null {
  const match = text.match(/^([a-z\s-]+?)\s+([a-z]+)$/)
  if (match === null) {
    return null
  }
  const amount = normalizeInteger(String(match[1]))
  const unit = UNIT_WORDS[String(match[2])]
  if (amount === null || unit === undefined) {
    return null
  }
  return `${amount} ${unit}`
}

function strengthPointFive(text: string): string | null {
  const match = text.match(/^point\s+(\w+)\s+([a-z]+)$/)
  if (match === null) {
    return null
  }
  const digit = normalizeInteger(String(match[1]))
  const unit = UNIT_WORDS[String(match[2])]
  if (digit === null || unit === undefined) {
    return null
  }
  return `0.${digit} ${unit}`
}

const STRENGTH_PARSERS: readonly ((text: string) => string | null)[] = [
  strengthPerUnit,
  strengthNumeric,
  strengthSpelled,
  strengthPointFive,
]

export function normalizeStrength(raw: string): string | null {
  const text = collapseThousandsSeparators(raw.trim().toLowerCase()).replace(/\s+/g, " ")
  for (const parse of STRENGTH_PARSERS) {
    const value = parse(text)
    if (value !== null) {
      return value
    }
  }
  return null
}

const COUNT_UNIT =
  /^(.+?)\s+(tablets?|capsules?|caps?|pills?|vials?|ampoules?|ampules?|patch(?:es)?|inhalers?|bottles?|doses?|syringes?|days?(?:'s?)?(?:\s+supply)?)$/

const SPOKEN_ROUTES: readonly (readonly [RegExp, string])[] = [
  [/^(by mouth|orally|oral|p\.?\s?o\.?|per os)$/, "ORAL"],
  [/^(intravenous(ly)?|i\.?\s?v\.?|into the vein)$/, "INTRAVENOUS"],
  [/^(intramuscular(ly)?|i\.?\s?m\.?|into the muscle)$/, "INTRAMUSCULAR"],
  [/^(subcutaneous(ly)?|sub-?q|under the skin)$/, "SUBCUTANEOUS"],
  [/^(sublingual(ly)?|under the tongue)$/, "SUBLINGUAL"],
  [/^(rectal(ly)?)$/, "RECTAL"],
  [/^(topical(ly)?|on the skin)$/, "TOPICAL"],
  [/^(transdermal(ly)?)$/, "TRANSDERMAL"],
]

export function normalizeRoute(raw: string): string {
  const text = raw
    .trim()
    .toLowerCase()
    .replace(/[.,]+$/, "")
    .replace(/\s+/g, " ")
  const known = SPOKEN_ROUTES.find(([pattern]) => pattern.test(text))
  return known === undefined ? text.toUpperCase() : known[1]
}

export function normalizeCount(raw: string): number | null {
  const plain = normalizeInteger(raw)
  if (plain !== null) {
    return plain
  }
  const match = raw
    .trim()
    .toLowerCase()
    .replace(/[.,]+$/, "")
    .match(COUNT_UNIT)
  return match === null ? null : normalizeInteger(String(match[1]))
}

function normalizeName(raw: string): string | null {
  const text = raw.trim().replace(/\s+/g, " ")
  if (text.length === 0) {
    return null
  }
  return text
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

export function normalizeFieldValue(field: FieldName, raw: string): NormalizedValue {
  const text = raw.trim()
  if (text.length === 0) {
    return null
  }
  switch (field) {
    case FieldName.Quantity:
    case FieldName.DaysSupply:
      return normalizeCount(text)
    case FieldName.Refills:
      return normalizeInteger(text)
    case FieldName.Strength:
      return normalizeStrength(text)
    case FieldName.PrescriberNpi:
      return normalizeNpi(text)
    case FieldName.PrescriberDea:
      return normalizeDea(text)
    case FieldName.PatientName:
      return normalizeName(text)
    case FieldName.DrugName:
      return text.toLowerCase().replace(/\s+/g, " ")
    case FieldName.DosageForm:
      return text.toUpperCase().replace(/\s+/g, " ")
    case FieldName.Route:
      return normalizeRoute(text)
    case FieldName.Sig:
      return text.replace(/\s+/g, " ")
    default:
      return text
  }
}
