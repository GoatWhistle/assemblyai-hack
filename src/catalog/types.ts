export type CatalogCombo = {
  readonly strength: string
  readonly dosageForm: string
  readonly route: string
}

export type CatalogDrug = {
  readonly nonproprietaryName: string
  readonly proprietaryNames: readonly string[]
  readonly deaSchedule: string | null
  readonly combos: readonly CatalogCombo[]
}

export type CatalogFile = {
  readonly builtAt: string
  readonly sourceUrl: string
  readonly rowsRead: number
  readonly rowsAfterPrescriptionFilter: number
  readonly rowsAfterDedup: number
  readonly drugs: readonly CatalogDrug[]
}

export type DrugMatch = {
  readonly drug: CatalogDrug
  readonly matchKind: "exact" | "prefix" | "substring"
}
