#!/usr/bin/env -S npx tsx

import { findDrug, loadCatalogFrom } from "@/catalog"
import { LASA_PAIRS, normalizeTerm } from "@/lasa"

function main(): void {
  const path = process.argv[2] ?? "data/catalog.json"
  const index = loadCatalogFrom(path)

  const rawNames = new Set<string>()
  for (const drug of index.file.drugs) {
    rawNames.add(normalizeTerm(drug.nonproprietaryName))
    for (const brand of drug.proprietaryNames) {
      rawNames.add(normalizeTerm(brand))
    }
  }

  let naiveHits = 0
  let strippedHits = 0
  let bothSidesPresent = 0
  const missing: string[] = []

  const terms = new Set<string>()
  for (const pair of LASA_PAIRS) {
    terms.add(pair.termA)
    terms.add(pair.termB)
  }

  for (const term of terms) {
    const naive = rawNames.has(normalizeTerm(term))
    const stripped = findDrug(index, term) !== null
    if (naive) {
      naiveHits += 1
    }
    if (stripped) {
      strippedHits += 1
    } else {
      missing.push(term)
    }
  }

  for (const pair of LASA_PAIRS) {
    if (findDrug(index, pair.termA) !== null && findDrug(index, pair.termB) !== null) {
      bothSidesPresent += 1
    }
  }

  const total = terms.size
  const pct = (n: number): string => `${((100 * n) / total).toFixed(1)}%`

  console.log(`catalogue                      ${path} (${index.file.drugs.length} drug names)`)
  console.log(`LASA pairs                     ${LASA_PAIRS.length}`)
  console.log(`distinct LASA terms            ${total}`)
  console.log(`matched, exact name only       ${naiveHits} (${pct(naiveHits)})`)
  console.log(`matched, salt-stripped lookup  ${strippedHits} (${pct(strippedHits)})`)
  console.log(
    `gain from salt stripping       +${strippedHits - naiveHits} terms (${pct(strippedHits - naiveHits)} of terms)`,
  )
  console.log(
    `pairs with both sides present  ${bothSidesPresent} of ${LASA_PAIRS.length} (${((100 * bothSidesPresent) / LASA_PAIRS.length).toFixed(1)}%)`,
  )
  if (missing.length > 0) {
    console.log(`terms absent from catalogue    ${missing.sort().join(", ")}`)
  }
}

main()
