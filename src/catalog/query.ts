import { normalizeDrugName } from "@/lasa"
import type { ComboQuery, SkeletonNeighbour, SkeletonSource } from "@/validators"
import { skeletonNeighbours } from "@/validators"
import type { CatalogIndex } from "./store"
import type { CatalogCombo, CatalogDrug, DrugMatch } from "./types"

function normalizeStrengthText(strength: string): string {
  return strength
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\/1$/, "")
    .replace(/mcg/g, "ug")
    .replace(/µg/g, "ug")
}

function normalizeCombo(combo: CatalogCombo): string {
  return [
    normalizeStrengthText(combo.strength),
    combo.dosageForm.trim().toLowerCase(),
    combo.route.trim().toLowerCase(),
  ].join("|")
}

export function findDrug(index: CatalogIndex, query: string): DrugMatch | null {
  const key = normalizeDrugName(query)
  if (key.length === 0) {
    return null
  }

  const exact = index.byName.get(key)
  if (exact !== undefined) {
    return { drug: exact, matchKind: "exact" }
  }

  const prefix = index.names.find((name) => name.startsWith(key))
  if (prefix !== undefined) {
    const drug = index.byName.get(prefix)
    if (drug !== undefined) {
      return { drug, matchKind: "prefix" }
    }
  }

  const substring = index.names.find((name) => name.includes(key))
  if (substring !== undefined) {
    const drug = index.byName.get(substring)
    if (drug !== undefined) {
      return { drug, matchKind: "substring" }
    }
  }

  return null
}

export function searchDrugs(
  index: CatalogIndex,
  query: string,
  limit: number,
): readonly DrugMatch[] {
  const key = normalizeDrugName(query)
  if (key.length === 0) {
    return []
  }
  const seen = new Set<string>()
  const out: DrugMatch[] = []
  const exact = findDrug(index, query)
  if (exact !== null) {
    seen.add(exact.drug.nonproprietaryName)
    out.push(exact)
  }
  for (const name of index.names) {
    if (out.length >= limit) {
      break
    }
    if (!name.includes(key)) {
      continue
    }
    const drug = index.byName.get(name)
    if (drug === undefined || seen.has(drug.nonproprietaryName)) {
      continue
    }
    seen.add(drug.nonproprietaryName)
    out.push({ drug, matchKind: name === key ? "exact" : "substring" })
  }
  return out.slice(0, limit)
}

export function combosFor(index: CatalogIndex, drugName: string): readonly CatalogCombo[] {
  const match = findDrug(index, drugName)
  return match === null ? [] : match.drug.combos
}

export function comboExists(index: CatalogIndex, query: ComboQuery): boolean {
  const combos = combosFor(index, query.drugName)
  const wanted = normalizeCombo({
    strength: query.strength,
    dosageForm: query.dosageForm,
    route: query.route,
  })
  return combos.some((combo) => normalizeCombo(combo) === wanted)
}

export function deaScheduleFor(index: CatalogIndex, drugName: string): string | null {
  const match = findDrug(index, drugName)
  return match === null ? null : match.drug.deaSchedule
}

export function drugCount(index: CatalogIndex): number {
  return index.file.drugs.length
}

export function allDrugNames(index: CatalogIndex): readonly string[] {
  return index.file.drugs.map((d: CatalogDrug) => d.nonproprietaryName)
}

function skeletonSourceFor(index: CatalogIndex): SkeletonSource {
  return {
    namesForSkeleton: (skeleton: string) => index.bySkeleton.get(skeleton) ?? [],
  }
}

export function neighbourFor(index: CatalogIndex, heard: string): SkeletonNeighbour | null {
  if (findDrug(index, heard) !== null) {
    return null
  }
  return skeletonNeighbours(heard, skeletonSourceFor(index))
}
