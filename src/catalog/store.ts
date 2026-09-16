import { CatalogUnavailableError } from "@/domain"
import { normalizeDrugName } from "@/lasa"
import type { CatalogDrug, CatalogFile } from "./types"

export type CatalogIndex = {
  readonly file: CatalogFile
  readonly byName: ReadonlyMap<string, CatalogDrug>
  readonly names: readonly string[]
}

function indexNames(drug: CatalogDrug): readonly string[] {
  return [drug.nonproprietaryName, ...drug.proprietaryNames]
}

export function buildIndex(file: CatalogFile): CatalogIndex {
  const byName = new Map<string, CatalogDrug>()
  for (const drug of file.drugs) {
    for (const name of indexNames(drug)) {
      const key = normalizeDrugName(name)
      if (key.length > 0 && !byName.has(key)) {
        byName.set(key, drug)
      }
    }
  }
  return Object.freeze({
    file,
    byName,
    names: Object.freeze([...byName.keys()].sort()),
  })
}

export function assertLoaded(index: CatalogIndex | null): CatalogIndex {
  if (index === null) {
    throw new CatalogUnavailableError(
      "data/catalog.json is not built; run make data before serving catalogue lookups",
    )
  }
  return index
}

export function isCatalogFile(value: unknown): value is CatalogFile {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const candidate = value as { drugs?: unknown }
  return Array.isArray(candidate.drugs)
}
