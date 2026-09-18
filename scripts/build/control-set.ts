#!/usr/bin/env -S npx tsx

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { seededRandom } from "../../src/stats/seeded-random"

const SEED = 20260916
const COUNT = 40

type Catalog = { readonly drugs: readonly { readonly nonproprietaryName: string }[] }
type Pairs = { readonly pairs: readonly { readonly termA: string; readonly termB: string }[] }

function main(): void {
  const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8")) as Catalog
  const pairs = JSON.parse(readFileSync("data/lasa-pairs.json", "utf8")) as Pairs
  const pairTerms = new Set(
    pairs.pairs.flatMap((pair) => [pair.termA.toLowerCase(), pair.termB.toLowerCase()]),
  )

  const candidates = [
    ...new Set(
      catalog.drugs
        .map((drug) => drug.nonproprietaryName.toLowerCase())
        .filter((name) => /^[a-z]+$/.test(name) && name.length >= 6 && name.length <= 16)
        .filter((name) => !pairTerms.has(name)),
    ),
  ].sort()

  const random = seededRandom(SEED)
  const picked: string[] = []
  const taken = new Set<number>()
  while (picked.length < COUNT && taken.size < candidates.length) {
    const index = Math.floor(random() * candidates.length)
    if (taken.has(index)) {
      continue
    }
    taken.add(index)
    const name = candidates[index]
    if (name !== undefined) {
      picked.push(name)
    }
  }

  const outDir = "eval/control"
  mkdirSync(outDir, { recursive: true })
  const payload = {
    builtAt: new Date().toISOString(),
    seed: SEED,
    method:
      "single-word generic names from the built NDC catalogue, 6 to 16 letters, excluding every term in the curated LASA table, sampled with a fixed seed",
    purpose:
      "a control group for the confidence comparison: if confidence on these matches confidence on LASA terms, then confidence cannot be what distinguishes a risky name from a safe one",
    candidatePool: candidates.length,
    count: picked.length,
    terms: picked,
  }
  writeFileSync(resolve(outDir, "terms.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8")
  console.log(`control set: ${picked.length} terms drawn from ${candidates.length} candidates`)
  console.log(`  ${picked.slice(0, 8).join(", ")}, ...`)
  console.log(`wrote ${outDir}/terms.json`)
}

main()
