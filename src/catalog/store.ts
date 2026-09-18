import { normalizeDrugName } from "@/lasa"
import { consonantSkeleton } from "@/validators/skeleton"
import type { CatalogDrug, CatalogFile } from "./types"

export type CatalogIndex = {
  readonly file: CatalogFile
  readonly byName: ReadonlyMap<string, CatalogDrug>
  readonly names: readonly string[]
  readonly bySkeleton: ReadonlyMap<string, readonly string[]>
}

function indexNames(drug: CatalogDrug): readonly string[] {
  return [drug.nonproprietaryName, ...drug.proprietaryNames]
}

export function buildIndex(file: CatalogFile): CatalogIndex {
  const byName = new Map<string, CatalogDrug>()
  const bySkeleton = new Map<string, string[]>()
  for (const drug of file.drugs) {
    for (const name of indexNames(drug)) {
      const key = normalizeDrugName(name)
      if (key.length === 0) {
        continue
      }
      if (!byName.has(key)) {
        byName.set(key, drug)
      }
      const skeleton = consonantSkeleton(key)
      if (skeleton.length === 0) {
        continue
      }
      const bucket = bySkeleton.get(skeleton)
      if (bucket === undefined) {
        bySkeleton.set(skeleton, [key])
      } else if (!bucket.includes(key)) {
        bucket.push(key)
      }
    }
  }
  return Object.freeze({
    file,
    byName,
    names: Object.freeze([...byName.keys()].sort()),
    bySkeleton: new Map([...bySkeleton].map(([k, v]) => [k, Object.freeze([...v].sort())])),
  })
}

export function isCatalogFile(value: unknown): value is CatalogFile {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const candidate = value as { drugs?: unknown }
  return Array.isArray(candidate.drugs)
}
