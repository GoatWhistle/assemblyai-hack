import { makeVerdict, type ValidatorVerdict, VerdictOutcome } from "@/domain"

export type ComboQuery = {
  readonly drugName: string
  readonly strength: string
  readonly dosageForm: string
  readonly route: string
}

export type ComboSource = {
  comboExists(query: ComboQuery): boolean
  combosFor(drugName: string): readonly Omit<ComboQuery, "drugName">[]
  partnersOf?(drugName: string): readonly string[]
}

function describe(query: ComboQuery): string {
  return `${query.drugName} ${query.strength} ${query.dosageForm} ${query.route}`
}

const SPOKEN_UNITS: Readonly<Record<string, string>> = Object.freeze({
  mg: "milligram",
  mcg: "microgram",
  g: "gram",
  ml: "milliliter",
  "%": "percent",
  meq: "milliequivalent",
})

function spokenUnit(unit: string): string {
  return SPOKEN_UNITS[unit.toLowerCase()] ?? unit
}

export function spokenStrength(strength: string): string {
  return strength
    .replace(/\/1$/, "")
    .split("/")
    .map((part) =>
      part
        .trim()
        .replace(
          /^(\d*\.?\d*)\s*([a-z%]+)$/i,
          (_all, amount: string, unit: string) =>
            `${amount}${amount.length > 0 ? " " : ""}${spokenUnit(unit)}`,
        ),
    )
    .join(" per ")
}

function article(spoken: string): string {
  return /^(8|11|18)/.test(spoken) ? "an" : "a"
}

function partnersWithCombo(query: ComboQuery, source: ComboSource): readonly string[] {
  return (source.partnersOf?.(query.drugName) ?? []).filter((partner) =>
    source.comboExists({ ...query, drugName: partner }),
  )
}

export function validateCombo(query: ComboQuery, source: ComboSource): ValidatorVerdict {
  if (source.comboExists(query)) {
    return makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "combo_consistency",
      detail: `${describe(query)} exists in the built catalogue`,
      checkedValue: describe(query),
      evidence: { ...query, hasCheckDigit: false },
    })
  }

  const alternatives = source.combosFor(query.drugName)

  if (alternatives.length === 0) {
    return makeVerdict({
      outcome: VerdictOutcome.NotInCatalog,
      validatorName: "combo_consistency",
      detail: `the catalogue holds no product at all under ${query.drugName}`,
      checkedValue: describe(query),
      evidence: { ...query, alternativeCount: 0 },
    })
  }

  const offered = alternatives
    .slice(0, 3)
    .map((a) => `${a.strength} ${a.dosageForm} ${a.route}`)
    .join("; ")

  const partners = partnersWithCombo(query, source)
  if (partners.length > 0) {
    const product = `${spokenStrength(query.strength)} ${query.dosageForm.toLowerCase()}`
    return makeVerdict({
      outcome: VerdictOutcome.InconsistentCombo,
      validatorName: "combo_consistency",
      detail: `${query.drugName} does not come as ${article(product)} ${product}; ${partners.join(" or ")} ${partners.length === 1 ? "does" : "do"}`,
      checkedValue: describe(query),
      evidence: {
        ...query,
        alternativeCount: alternatives.length,
        alternatives: offered,
        partnersWithCombo: partners.join(", "),
      },
    })
  }

  return makeVerdict({
    outcome: VerdictOutcome.InconsistentCombo,
    validatorName: "combo_consistency",
    detail: `${describe(query)} does not exist; the catalogue lists ${query.drugName} as ${offered}`,
    checkedValue: describe(query),
    evidence: {
      ...query,
      alternativeCount: alternatives.length,
      alternatives: offered,
    },
  })
}
