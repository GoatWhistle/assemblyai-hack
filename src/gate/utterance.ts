import {
  type FieldCandidate,
  FieldName,
  type FieldPolicy,
  type LasaRisk,
  type NormalizedValue,
} from "@/domain"
import { spellForPolicy, spellInstruction } from "./spell-out"

const SPOKEN_FIELD: Readonly<Record<FieldName, string>> = Object.freeze({
  [FieldName.DrugName]: "the drug name",
  [FieldName.Strength]: "the strength",
  [FieldName.DosageForm]: "the dosage form",
  [FieldName.Route]: "the route",
  [FieldName.Quantity]: "the quantity",
  [FieldName.Sig]: "the directions",
  [FieldName.PrescriberNpi]: "the prescriber NPI",
  [FieldName.PrescriberDea]: "the prescriber DEA number",
  [FieldName.PatientName]: "the patient name",
  [FieldName.Refills]: "the refills",
  [FieldName.DaysSupply]: "the days supply",
})

export function spokenField(field: FieldName): string {
  return SPOKEN_FIELD[field] ?? field.replace(/_/g, " ")
}

export function spokenFieldLeading(field: FieldName): string {
  const spoken = spokenField(field)
  return spoken.charAt(0).toUpperCase() + spoken.slice(1)
}

export function escalateUtterance(): string {
  return "I want to make sure we get this exactly right. I am bringing a pharmacist onto the line to take this field."
}

export function abortUtterance(field: FieldName): string {
  return `I will leave ${spokenField(field)} blank and flag it for the pharmacy to fill in.`
}

export function normalizeFailedUtterance(candidate: FieldCandidate): string {
  const spoken = spokenField(candidate.field)
  return `I heard ${spoken} as "${candidate.rawValue}", but I could not put that into a standard form. Could you give me ${spoken} as a plain number or value?`
}

export function checksumUtterance(
  field: FieldName,
  value: NormalizedValue,
  policy: FieldPolicy,
): string {
  const spelled = spellForPolicy(String(value), policy)
  return `${spokenFieldLeading(field)} I have, ${spelled}, does not pass its check, so one character is off. Please read it back to me one character at a time.`
}

export function ruleForbidsUtterance(field: FieldName, detail: string): string {
  return `${detail}. I cannot take ${spokenField(field)} as heard. Shall I record none?`
}

export function recoveredNames(candidate: FieldCandidate): readonly string[] {
  const named = candidate.verdict.evidence.skeletonNeighbours
  if (typeof named !== "string" || named.trim().length === 0) {
    return []
  }
  return named
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
}

export function catalogUtterance(candidate: FieldCandidate): string {
  const opening = `I do not find "${candidate.rawValue}" in the drug directory.`
  const closing = `Could you say ${spokenField(candidate.field)} again, or spell the first few letters?`
  const recovered = recoveredNames(candidate)
  if (recovered.length === 0) {
    return `${opening} ${closing}`
  }
  return `${opening} The closest name I do hold is ${recovered.join(" or ")}, which differs only in its vowels. Did you mean ${recovered.join(" or ")}, or should I take it again?`
}

export function comboUtterance(detail: string): string {
  return `${detail}. Which part should I change?`
}

export function lasaUtterance(lasa: LasaRisk): string {
  const heard = String(lasa.matchedTerm)
  const partners = [...lasa.confusableWith]
  const alternatives = [heard, ...partners].join(" or ")
  return `I heard ${heard}. That name is on the published confused-drug-names list together with ${partners.join(", ")}. To be certain: did you say ${alternatives}?`
}

export function noValidatorUtterance(field: FieldName, value: NormalizedValue): string {
  return `Let me confirm ${spokenField(field)}: ${value}. Is that right?`
}

export function spellOutUtterance(field: FieldName, policy: FieldPolicy): string {
  return `I am still not certain about ${spokenField(field)}. Could you give it to me ${spellInstruction(policy)}?`
}

export function lowConfidenceUtterance(field: FieldName, value: NormalizedValue): string {
  return `I think I heard ${spokenField(field)} as ${value}. Is that correct?`
}

export function readBackUtterance(field: FieldName, value: NormalizedValue): string {
  return `Confirming ${spokenField(field)}: ${value}. Correct?`
}

export function acceptUtterance(field: FieldName, value: NormalizedValue): string {
  return `Got it, ${spokenField(field)} is ${value}.`
}
