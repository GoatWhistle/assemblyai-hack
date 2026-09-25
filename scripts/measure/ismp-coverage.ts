#!/usr/bin/env -S npx tsx

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { loadCatalog } from "../../src/catalog"
import { ISMP_PAIR_RECORDS, LASA_PAIRS, lasaCheckedTerms, lasaRiskFor } from "../../src/lasa"
import { normalizeDrugName } from "../../src/lasa/normalize"
import { wilson } from "../../src/stats/wilson"
import { consonantSkeleton } from "../../src/validators/skeleton"

const SNAPSHOT = "data/lasa-pairs.json"
const CORPORA: readonly (readonly [string, readonly string[]])[] = [
  ["control corpus", ["eval/control/result-plain.json", "eval/native16/result-plain.json"]],
  ["held-out corpus", ["eval/heldout/result-plain.json"]],
]
const BUCKETS: readonly (readonly [string, number, number])[] = [
  ["0", 0, 0],
  ["1", 1, 1],
  ["2", 2, 2],
  ["3", 3, 3],
  ["4 to 5", 4, 5],
  ["6 to 9", 6, 9],
  ["10 or more", 10, Number.POSITIVE_INFINITY],
]

type Scored = { readonly heard: string; readonly correct: boolean }

export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current.push(
        Math.min(
          (previous[j] ?? 0) + 1,
          (current[j - 1] ?? 0) + 1,
          (previous[j - 1] ?? 0) + cost,
        ),
      )
    }
    previous = current
  }
  return previous[b.length] ?? 0
}

function pct(part: number, total: number): string {
  if (total === 0) {
    return "n/a"
  }
  const interval = wilson(part, total)
  return `${((part / total) * 100).toFixed(1)}% [${(interval.low * 100).toFixed(1)}%, ${(interval.high * 100).toFixed(1)}%]`
}

function share(part: number, total: number): string {
  return total === 0 ? "n/a" : `${((part / total) * 100).toFixed(1)}%`
}

function main(): void {
  const file = JSON.parse(readFileSync(resolve(SNAPSHOT), "utf8")) as {
    source: string
    rowsParsed: number
    rowsUnresolved: readonly unknown[]
  }
  const catalog = loadCatalog()
  const inCatalog = (term: string): boolean => catalog.byName.has(normalizeDrugName(term))
  const generics = new Set(
    catalog.file.drugs.map((drug) => normalizeDrugName(drug.nonproprietaryName)),
  )

  const pairs = ISMP_PAIR_RECORDS
  const both = pairs.filter((pair) => inCatalog(pair.termA) && inCatalog(pair.termB)).length
  const one = pairs.filter((pair) => inCatalog(pair.termA) !== inCatalog(pair.termB)).length
  const terms = lasaCheckedTerms()
  const brands = [...terms].filter((term) => inCatalog(term) && !generics.has(term)).length

  console.log(`source: ${file.source}, parsed from the PDF into ${SNAPSHOT}`)
  console.log(
    `rows parsed: ${file.rowsParsed}; row groups left unresolved: ${file.rowsUnresolved.length}`,
  )
  console.log(
    `distinct pairs in the full list: ${pairs.length}; curated tier: ${LASA_PAIRS.length}, every one a row of the full list`,
  )
  console.log(`distinct names the product rule checks: ${terms.size}`)
  console.log("")
  console.log(
    `pairs with both names in the catalogue: ${both} of ${pairs.length} (${share(both, pairs.length)})`,
  )
  console.log(
    `pairs with one name in the catalogue: ${one} of ${pairs.length} (${share(one, pairs.length)})`,
  )
  console.log(
    `listed names found in the catalogue only as a brand, mapped to a generic through proprietaryNames: ${brands}`,
  )

  const onList = catalog.file.drugs.filter((drug) =>
    [drug.nonproprietaryName, ...drug.proprietaryNames].some((name) =>
      terms.has(normalizeDrugName(name)),
    ),
  ).length
  console.log(
    `catalogue drugs carrying a name on the list, so every dictation of them gets a contrastive question: ${onList} of ${catalog.file.drugs.length} (${share(onList, catalog.file.drugs.length)})`,
  )

  const distances = pairs.map((pair) =>
    editDistance(consonantSkeleton(pair.termA), consonantSkeleton(pair.termB)),
  )
  console.log("")
  console.log(
    "consonant-skeleton edit distance between the two names of each pair, measured and not used as a filter:",
  )
  console.log("| Distance | Pairs |")
  console.log("|---|---|")
  for (const [label, low, high] of BUCKETS) {
    const count = distances.filter((d) => d >= low && d <= high).length
    console.log(`| ${label} | ${count} (${share(count, pairs.length)}) |`)
  }
  const sorted = [...distances].sort((a, b) => a - b)
  console.log(`median distance: ${sorted[Math.floor(sorted.length / 2)] ?? 0}`)

  console.log("")
  for (const [label, paths] of CORPORA) {
    const correct = paths
      .flatMap(
        (path) =>
          (JSON.parse(readFileSync(resolve(path), "utf8")) as { scored: readonly Scored[] })
            .scored,
      )
      .filter((entry) => entry.correct)
    const hits = correct.filter((entry) => lasaRiskFor(entry.heard).hit)
    console.log(
      `${label}, correct values the full list puts to a contrastive question: ${hits.length} of ${correct.length}, ${pct(hits.length, correct.length)}${hits.length > 0 ? ` (${hits.map((h) => h.heard).join(", ")})` : ""}`,
    )
  }
}

if (process.argv[1]?.includes("ismp-coverage")) {
  main()
}
