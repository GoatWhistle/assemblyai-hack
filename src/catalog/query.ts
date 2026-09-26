import { normalizeDrugName } from "@/lasa"
import type { ComboQuery, SkeletonNeighbour, SkeletonSource } from "@/validators"
import { skeletonNeighbours } from "@/validators"
import type { CatalogIndex } from "./store"
import type { CatalogCombo, DrugMatch } from "./types"

function normalizeStrengthText(strength: string): string {
  return strength
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\/1$/, "")
    .replace(/mcg/g, "ug")
    .replace(/µg/g, "ug")
}

function routeSet(route: string): ReadonlySet<string> {
  return new Set(
    route
      .split(";")
      .map((member) => member.trim().toLowerCase().replace(/\s+/g, " "))
      .filter((member) => member.length > 0),
  )
}

function routeCovered(requested: string, listed: string): boolean {
  const wanted = routeSet(requested)
  if (wanted.size === 0) {
    return false
  }
  const offered = routeSet(listed)
  return [...wanted].every((member) => offered.has(member))
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

function formCovered(requested: string, listed: string): boolean {
  const wanted = requested.trim().toLowerCase()
  const offered = listed.trim().toLowerCase()
  return wanted.length > 0 && (offered === wanted || offered.startsWith(`${wanted},`))
}

export function comboExists(index: CatalogIndex, query: ComboQuery): boolean {
  const combos = combosFor(index, query.drugName)
  const strength = normalizeStrengthText(query.strength)
  return combos.some(
    (combo) =>
      normalizeStrengthText(combo.strength) === strength &&
      formCovered(query.dosageForm, combo.dosageForm) &&
      routeCovered(query.route, combo.route),
  )
}

export function deaScheduleFor(index: CatalogIndex, drugName: string): string | null {
  const match = findDrug(index, drugName)
  return match === null ? null : match.drug.deaSchedule
}

export function drugCount(index: CatalogIndex): number {
  return index.file.drugs.length
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
