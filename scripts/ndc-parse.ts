import type { CatalogCombo, CatalogDrug } from "@/catalog"

export const PRESCRIPTION_TYPE = "HUMAN PRESCRIPTION DRUG"

export type ProductRow = Readonly<Record<string, string>>

export type ParseStats = {
  rowsRead: number
  rowsAfterPrescriptionFilter: number
  rowsAfterDedup: number
  productTypes: Record<string, number>
}

export function parseTsv(text: string): readonly ProductRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  const header = lines[0]
  if (header === undefined) {
    return []
  }
  const columns = header.split("\t")
  const rows: ProductRow[] = []
  for (const line of lines.slice(1)) {
    const cells = line.split("\t")
    const row: Record<string, string> = {}
    for (let i = 0; i < columns.length; i += 1) {
      row[String(columns[i])] = cells[i] ?? ""
    }
    rows.push(row)
  }
  return rows
}

export function strengthOf(row: ProductRow): string {
  const amount = (row.ACTIVE_NUMERATOR_STRENGTH ?? "").split(";")[0]?.trim() ?? ""
  const unit = (row.ACTIVE_INGRED_UNIT ?? "").split(";")[0]?.trim() ?? ""
  return `${amount} ${unit}`.trim()
}

function comboKey(name: string, combo: CatalogCombo): string {
  return [name, combo.strength, combo.dosageForm, combo.route]
    .map((p) => p.toLowerCase())
    .join("|")
}

export function buildDrugs(rows: readonly ProductRow[]): {
  drugs: readonly CatalogDrug[]
  stats: ParseStats
} {
  const productTypes: Record<string, number> = {}
  for (const row of rows) {
    const type = row.PRODUCTTYPENAME ?? ""
    productTypes[type] = (productTypes[type] ?? 0) + 1
  }

  const prescription = rows.filter((r) => r.PRODUCTTYPENAME === PRESCRIPTION_TYPE)

  const seen = new Set<string>()
  const byName = new Map<
    string,
    {
      nonproprietaryName: string
      proprietaryNames: Set<string>
      deaSchedule: string | null
      combos: CatalogCombo[]
    }
  >()

  for (const row of prescription) {
    const name = (row.NONPROPRIETARYNAME ?? "").trim().toLowerCase()
    if (name.length === 0) {
      continue
    }
    const combo: CatalogCombo = {
      strength: strengthOf(row),
      dosageForm: (row.DOSAGEFORMNAME ?? "").trim(),
      route: (row.ROUTENAME ?? "").trim(),
    }
    const key = comboKey(name, combo)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)

    const existing = byName.get(name)
    const entry = existing ?? {
      nonproprietaryName: name,
      proprietaryNames: new Set<string>(),
      deaSchedule: null,
      combos: [],
    }
    const brand = (row.PROPRIETARYNAME ?? "").trim()
    if (brand.length > 0) {
      entry.proprietaryNames.add(brand)
    }
    const schedule = (row.DEASCHEDULE ?? "").trim()
    if (schedule.length > 0) {
      entry.deaSchedule = schedule
    }
    entry.combos.push(combo)
    byName.set(name, entry)
  }

  const drugs: CatalogDrug[] = [...byName.values()].map((e) => ({
    nonproprietaryName: e.nonproprietaryName,
    proprietaryNames: [...e.proprietaryNames].sort().slice(0, 8),
    deaSchedule: e.deaSchedule,
    combos: e.combos,
  }))

  return {
    drugs,
    stats: {
      rowsRead: rows.length,
      rowsAfterPrescriptionFilter: prescription.length,
      rowsAfterDedup: seen.size,
      productTypes,
    },
  }
}
