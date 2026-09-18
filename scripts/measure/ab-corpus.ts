import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { seededRandom } from "../../src/stats/seeded-random"

export type AbCase = {
  readonly id: string
  readonly spoken: string
  readonly recognized: string
  readonly confidence: number
  readonly misheard: boolean
}

type CatalogFile = { readonly drugs: readonly { readonly nonproprietaryName: string }[] }
type PairsFile = {
  readonly pairs: readonly { readonly termA: string; readonly termB: string }[]
}

const CORRECT_CONFIDENCES = [1, 0.99, 0.97, 0.96, 0.94, 0.88, 0.72] as const
const MISHEARD_CONFIDENCES = [1, 0.99, 0.97, 0.92, 0.61] as const

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), "utf8")) as T
}

export function buildAbCorpus(seed: number): readonly AbCase[] {
  const pairs = readJson<PairsFile>("data/lasa-pairs.json").pairs
  const catalog = readJson<CatalogFile>("data/catalog.json").drugs
  const random = seededRandom(seed)
  const cases: AbCase[] = []

  for (const [index, pair] of pairs.entries()) {
    const confidence = MISHEARD_CONFIDENCES[index % MISHEARD_CONFIDENCES.length] ?? 1
    cases.push({
      id: `misheard-${pair.termA}-as-${pair.termB}`,
      spoken: pair.termA,
      recognized: pair.termB,
      confidence,
      misheard: true,
    })
  }

  const names = catalog
    .map((drug) => drug.nonproprietaryName)
    .filter((name) => /^[a-z ]+$/.test(name) && !name.includes(" "))

  const pairTerms = new Set(pairs.flatMap((pair) => [pair.termA, pair.termB]))
  const safe = names.filter((name) => !pairTerms.has(name))

  for (let index = 0; index < pairs.length; index += 1) {
    const pick = safe[Math.floor(random() * safe.length)]
    if (pick === undefined) {
      continue
    }
    const confidence = CORRECT_CONFIDENCES[index % CORRECT_CONFIDENCES.length] ?? 1
    cases.push({
      id: `correct-${pick}-${index}`,
      spoken: pick,
      recognized: pick,
      confidence,
      misheard: false,
    })
  }

  return cases
}
