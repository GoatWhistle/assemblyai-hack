import { FieldName, type NormalizedValue } from "@/domain"
import { normalizeDea, normalizeNpi } from "@/validators"

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
  const text = raw.trim().toLowerCase()
  const direct = text.match(/^-?\d+$/)
  if (direct !== null) {
    return Number(text)
  }
  if (/^no\s+refills?$/.test(text) || text === "none" || text === "no") {
    return 0
  }
  const tokens = text.split(/[\s-]+/).filter((t) => t.length > 0)
  let total = 0
  let matched = 0
  for (const token of tokens) {
    const value = NUMBER_WORDS[token]
    if (value !== undefined) {
      total += value
      matched += 1
    }
  }
  return matched > 0 && matched === tokens.length ? total : null
}

export function normalizeStrength(raw: string): string | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, " ")
  const perUnit = text.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)\s*\/\s*(\d*)\s*([a-z]*)$/)
  if (perUnit !== null) {
    const unit = UNIT_WORDS[String(perUnit[2])] ?? perUnit[2]
    const denominator = String(perUnit[3] ?? "")
    const denominatorUnit = String(perUnit[4] ?? "")
    if (denominator === "1" && denominatorUnit.length === 0) {
      return `${perUnit[1]} ${unit}`
    }
    return `${perUnit[1]} ${unit}/${denominator}${denominatorUnit}`
  }
  const numeric = text.match(/^(\d+(?:\.\d+)?)\s*([a-z%]+)$/)
  if (numeric !== null) {
    const unit = UNIT_WORDS[String(numeric[2])] ?? numeric[2]
    return `${numeric[1]} ${unit}`
  }
  const spelled = text.match(/^([a-z\s-]+?)\s+([a-z]+)$/)
  if (spelled !== null) {
    const amount = normalizeInteger(String(spelled[1]))
    const unit = UNIT_WORDS[String(spelled[2])]
    if (amount !== null && unit !== undefined) {
      return `${amount} ${unit}`
    }
  }
  const pointFive = text.match(/^point\s+(\w+)\s+([a-z]+)$/)
  if (pointFive !== null) {
    const digit = normalizeInteger(String(pointFive[1]))
    const unit = UNIT_WORDS[String(pointFive[2])]
    if (digit !== null && unit !== undefined) {
      return `0.${digit} ${unit}`
    }
  }
  return null
}

export function normalizeName(raw: string): string | null {
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
    case FieldName.Refills:
    case FieldName.DaysSupply:
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
    case FieldName.Route:
      return text.toUpperCase().replace(/\s+/g, " ")
    case FieldName.Sig:
      return text.replace(/\s+/g, " ")
    default:
      return text
  }
}
