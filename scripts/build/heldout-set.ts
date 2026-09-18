#!/usr/bin/env -S npx tsx

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { seededRandom } from "../../src/stats/seeded-random"

const SEED = 41
const PER_STRATUM = 20

type Catalog = {
  readonly builtAt: string
  readonly drugs: readonly {
    readonly nonproprietaryName: string
    readonly combos: readonly unknown[]
  }[]
}
type Pairs = { readonly pairs: readonly { readonly termA: string; readonly termB: string }[] }
type Terms = { readonly terms: readonly string[] }

function draw(pool: readonly string[], count: number, random: () => number): readonly string[] {
  const taken = new Set<number>()
  const picked: string[] = []
  while (picked.length < count && taken.size < pool.length) {
    const index = Math.floor(random() * pool.length)
    if (taken.has(index)) {
      continue
    }
    taken.add(index)
    const name = pool[index]
    if (name !== undefined) {
      picked.push(name)
    }
  }
  return picked
}

function main(): void {
  const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8")) as Catalog
  const pairs = JSON.parse(readFileSync("data/lasa-pairs.json", "utf8")) as Pairs
  const control = JSON.parse(readFileSync("eval/control/terms.json", "utf8")) as Terms

  const excluded = new Set<string>([
    ...pairs.pairs.flatMap((pair) => [pair.termA.toLowerCase(), pair.termB.toLowerCase()]),
    ...control.terms.map((term) => term.toLowerCase()),
  ])

  const combos = new Map(
    catalog.drugs.map((drug) => [drug.nonproprietaryName.toLowerCase(), drug.combos.length]),
  )

  const pool = [
    ...new Set(
      catalog.drugs
        .map((drug) => drug.nonproprietaryName.toLowerCase())
        .filter((name) => /^[a-z]+$/.test(name) && name.length >= 6 && name.length <= 16)
        .filter((name) => !excluded.has(name)),
    ),
  ].sort()

  const rare = pool.filter((name) => (combos.get(name) ?? 0) <= 1)
  const mid = pool.filter((name) => {
    const count = combos.get(name) ?? 0
    return count >= 2 && count <= 4
  })
  const common = pool.filter((name) => (combos.get(name) ?? 0) >= 5)

  const random = seededRandom(SEED)
  const terms = [
    ...draw(rare, PER_STRATUM, random),
    ...draw(mid, PER_STRATUM, random),
    ...draw(common, PER_STRATUM, random),
  ]

  const overlap = terms.filter((term) => excluded.has(term))
  if (overlap.length > 0) {
    console.error(`held-out overlaps the tuning sets: ${overlap.join(", ")}`)
    process.exit(1)
  }

  const outDir = "eval/heldout"
  mkdirSync(outDir, { recursive: true })
  const payload = {
    builtAt: new Date().toISOString(),
    seed: SEED,
    method:
      "single-word generic names from the built NDC catalogue, 6 to 16 letters, excluding every LASA pair term and every control term, stratified by catalogue combination count into at most one, two to four, and five or more, twenty drawn per stratum with a fixed seed",
    purpose:
      "a held-out set for the rarity hypothesis the control corpus suggested but could not demonstrate, drawn before any measurement and sealed",
    catalogBuiltAt: catalog.builtAt,
    strata: { rare: rare.length, mid: mid.length, common: common.length },
    poolAfterExclusions: pool.length,
    count: terms.length,
    terms,
  }
  writeFileSync(resolve(outDir, "terms.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8")

  console.log(`held-out: ${terms.length} terms, ${PER_STRATUM} per stratum, seed ${SEED}`)
  console.log(`  pool after exclusions: ${pool.length}`)
  console.log(
    `  strata available: rare ${rare.length}, mid ${mid.length}, common ${common.length}`,
  )
  console.log("  overlap with the tuning sets: none, asserted by construction")
  console.log(`wrote ${outDir}/terms.json`)
}

main()
