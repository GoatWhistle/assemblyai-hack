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
}

function describe(query: ComboQuery): string {
  return `${query.drugName} ${query.strength} ${query.dosageForm} ${query.route}`
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
