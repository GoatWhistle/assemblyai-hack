import { normalizeDrugName } from "@/lasa/normalize"
import { cleanLine, type IsmpRow } from "./lasa-parse"

export type IsmpPair = {
  readonly termA: string
  readonly termB: string
  readonly listedA: string
  readonly listedB: string
  readonly page: number
  readonly row: number
}

export function baseName(listed: string): string {
  return normalizeDrugName(
    cleanLine(listed)
      .replace(/\*/g, "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/\[[^\]]*\]/g, " "),
  )
}

export function pairsFromRows(rows: readonly IsmpRow[]): readonly IsmpPair[] {
  const seen = new Set<string>()
  const pairs: IsmpPair[] = []
  for (const row of rows) {
    const a = baseName(row.drug)
    const b = baseName(row.confused)
    if (a.length === 0 || b.length === 0 || a === b) {
      continue
    }
    const key = [a, b].sort().join("|")
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    pairs.push({
      termA: a,
      termB: b,
      listedA: cleanLine(row.drug),
      listedB: cleanLine(row.confused),
      page: row.page,
      row: row.row,
    })
  }
  return pairs
}
