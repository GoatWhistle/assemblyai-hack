import { cleanLasaRisk, type LasaRisk, makeLasaRisk } from "@/domain"
import { ISMP_PAIRS } from "./ismp"
import { normalizeDrugName } from "./normalize"
import { LASA_PAIRS, type LasaPair } from "./pairs"

type IndexEntry = {
  readonly canonical: string
  readonly partners: string[]
  readonly pair: LasaPair
}

function buildIndex(pairs: readonly LasaPair[]): ReadonlyMap<string, IndexEntry> {
  const index = new Map<string, IndexEntry>()
  const link = (term: string, partner: string, pair: LasaPair): void => {
    const key = normalizeDrugName(term)
    const other = normalizeDrugName(partner)
    const entry = index.get(key)
    if (entry === undefined) {
      index.set(key, { canonical: key, partners: [other], pair })
      return
    }
    if (!entry.partners.includes(other)) {
      entry.partners.push(other)
    }
  }
  for (const pair of pairs) {
    link(pair.termA, pair.termB, pair)
    link(pair.termB, pair.termA, pair)
  }
  return index
}

const INDEX = buildIndex([...LASA_PAIRS, ...ISMP_PAIRS])

export function lasaCheckedTerms(): ReadonlySet<string> {
  return new Set(INDEX.keys())
}

export function lasaRiskFor(term: string): LasaRisk {
  const entry = INDEX.get(normalizeDrugName(term))
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

export function ismpPairCount(): number {
  return ISMP_PAIRS.length
}
