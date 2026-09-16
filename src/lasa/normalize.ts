const SALT_SUFFIXES: readonly string[] = [
  "hydrochloride",
  "hydrobromide",
  "hydrogen sulfate",
  "hcl",
  "hbr",
  "sodium",
  "potassium",
  "calcium",
  "magnesium",
  "aluminum",
  "zinc",
  "lithium",
  "sulfate",
  "sulphate",
  "bisulfate",
  "tartrate",
  "bitartrate",
  "maleate",
  "malate",
  "mesylate",
  "mesilate",
  "besylate",
  "besilate",
  "tosylate",
  "succinate",
  "fumarate",
  "citrate",
  "acetate",
  "diacetate",
  "phosphate",
  "diphosphate",
  "nitrate",
  "oxalate",
  "bromide",
  "chloride",
  "iodide",
  "carbonate",
  "bicarbonate",
  "gluconate",
  "lactate",
  "stearate",
  "palmitate",
  "pamoate",
  "valerate",
  "propionate",
  "benzoate",
  "salicylate",
  "trometamol",
  "tromethamine",
  "dihydrate",
  "monohydrate",
  "trihydrate",
  "hemihydrate",
  "anhydrous",
  "micronized",
  "monosodium",
  "disodium",
]

export function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function stripSalt(term: string): string {
  let current = normalizeTerm(term)
  let changed = true
  while (changed) {
    changed = false
    for (const salt of SALT_SUFFIXES) {
      if (current === salt) {
        continue
      }
      if (current.endsWith(` ${salt}`)) {
        current = current.slice(0, -(salt.length + 1)).trim()
        changed = true
      }
    }
  }
  return current
}

export function normalizeDrugName(term: string): string {
  return stripSalt(term)
}

export const SALT_SUFFIX_COUNT = SALT_SUFFIXES.length
