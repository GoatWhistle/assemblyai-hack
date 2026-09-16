import { cleanLasaRisk, type LasaRisk, makeLasaRisk } from "@/domain"
import { normalizeDrugName } from "./normalize"
import { LASA_PAIRS, type LasaPair } from "./pairs"

type IndexEntry = {
  readonly canonical: string
  readonly partners: readonly string[]
  readonly pair: LasaPair
}

function buildIndex(pairs: readonly LasaPair[]): ReadonlyMap<string, IndexEntry> {
  const index = new Map<string, IndexEntry>()
  for (const pair of pairs) {
    const a = normalizeDrugName(pair.termA)
    const b = normalizeDrugName(pair.termB)
    index.set(a, { canonical: pair.termA, partners: [pair.termB], pair })
    index.set(b, { canonical: pair.termB, partners: [pair.termA], pair })
  }
  return index
}

const INDEX = buildIndex(LASA_PAIRS)

export function lasaCheckedTerms(): ReadonlySet<string> {
  return new Set(INDEX.keys())
}

export function lasaRiskFor(term: string): LasaRisk {
  const key = normalizeDrugName(term)
  const entry = INDEX.get(key)
  if (entry === undefined) {
    return cleanLasaRisk()
  }
  return makeLasaRisk({
    matchedTerm: entry.canonical,
    confusableWith: entry.partners,
    source: entry.pair.source,
    sourceRow: entry.pair.sourceRow,
  })
}

export function lasaPairCount(): number {
  return LASA_PAIRS.length
}
