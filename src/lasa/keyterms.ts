export const KEYTERMS_MAX = 100

const CLINIC_TERMS: readonly string[] = [
  "Mercy Family Clinic",
  "Northside Pharmacy",
  "Lakeview Medical Group",
  "Riverbend Health Center",
]

const PRESCRIBER_TERMS: readonly string[] = [
  "Doctor Alvarez",
  "Doctor Whitfield",
  "Doctor Okonkwo",
  "Doctor Lindqvist",
  "Doctor Ramaswamy",
  "Doctor Beaumont",
  "Nurse Practitioner Hale",
  "Physician Assistant Doyle",
]

const FORM_TERMS: readonly string[] = [
  "tablet",
  "tablets",
  "capsule",
  "capsules",
  "solution",
  "suspension",
  "injection",
  "ointment",
  "cream",
  "patch",
  "inhaler",
  "suppository",
]

const UNIT_TERMS: readonly string[] = [
  "milligram",
  "milligrams",
  "microgram",
  "micrograms",
  "milliliter",
  "milliliters",
  "gram",
  "grams",
  "unit",
  "units",
  "percent",
  "milliequivalent",
]

const ROUTE_TERMS: readonly string[] = [
  "by mouth",
  "oral",
  "orally",
  "intravenous",
  "intravenously",
  "topical",
  "subcutaneous",
  "intramuscular",
  "sublingual",
  "rectal",
  "inhalation",
  "ophthalmic",
  "otic",
  "transdermal",
]

const DICTATION_TERMS: readonly string[] = [
  "NPI",
  "DEA",
  "refills",
  "no refills",
  "days supply",
  "quantity",
  "dispense",
  "sig",
  "as needed",
  "take one",
  "take two",
  "once daily",
  "twice daily",
  "three times daily",
  "four times daily",
  "at bedtime",
]

const NATO_TERMS: readonly string[] = [
  "Alfa",
  "Bravo",
  "Charlie",
  "Delta",
  "Echo",
  "Foxtrot",
  "Golf",
  "Hotel",
  "India",
  "Juliett",
  "Kilo",
  "Lima",
  "Mike",
  "November",
  "Oscar",
  "Papa",
  "Quebec",
  "Romeo",
  "Sierra",
  "Tango",
  "Uniform",
  "Victor",
  "Whiskey",
  "Xray",
  "Yankee",
  "Zulu",
]

export function buildKeyterms(): readonly string[] {
  const all = [
    ...CLINIC_TERMS,
    ...PRESCRIBER_TERMS,
    ...FORM_TERMS,
    ...UNIT_TERMS,
    ...ROUTE_TERMS,
    ...DICTATION_TERMS,
    ...NATO_TERMS,
  ]
  const seen = new Set<string>()
  const out: string[] = []
  for (const term of all) {
    const key = term.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(term)
    }
  }
  return out
}
