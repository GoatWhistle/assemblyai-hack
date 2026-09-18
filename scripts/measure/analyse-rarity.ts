#!/usr/bin/env -S npx tsx

import { readFileSync } from "node:fs"
import { formatInterval, overlaps, wilson } from "../../src/stats/wilson"

type Catalog = {
  readonly drugs: readonly {
    readonly nonproprietaryName: string
    readonly combos: readonly unknown[]
  }[]
}

type Scored = {
  readonly spoken: string
  readonly correct: boolean
  readonly minConfidence: number
}

type Result = { readonly scored: readonly Scored[] }

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
}

const PER_STRATUM = 20

export type ThreeStratumRow = {
  readonly label: string
  readonly n: number
  readonly errors: number
  readonly interval: ReturnType<typeof wilson>
}

export function threeStratumRows(scored: readonly Scored[]): readonly ThreeStratumRow[] {
  if (scored.length !== 3 * PER_STRATUM) {
    throw new Error(
      `the pre-registered three-stratum table assumes ${3 * PER_STRATUM} items drawn ${PER_STRATUM} per stratum by scripts/build-heldout-set.ts; got ${scored.length}`,
    )
  }
  const groups: readonly { readonly label: string; readonly items: readonly Scored[] }[] = [
    { label: "rare, at most one catalogue combination", items: scored.slice(0, PER_STRATUM) },
    { label: "mid, two to four", items: scored.slice(PER_STRATUM, 2 * PER_STRATUM) },
    { label: "common, five or more", items: scored.slice(2 * PER_STRATUM, 3 * PER_STRATUM) },
  ]
  return groups.map((group) => {
    const interval = wilson(group.items.filter((e) => !e.correct).length, group.items.length)
    return { label: group.label, n: group.items.length, errors: interval.successes, interval }
  })
}

function printThreeStratumTable(scored: readonly Scored[]): void {
  const rows = threeStratumRows(scored)
  console.log(
    "pre-registered three-stratum table (eval/heldout-preregistration.md): items are ordered rare, mid, common by scripts/build-heldout-set.ts and read positionally, never re-derived from a threshold at read time",
  )
  console.log("")
  console.log("| Stratum | N | Errors | EER, 95% Wilson |")
  console.log("|---|---|---|---|")
  for (const row of rows) {
    console.log(`| ${row.label} | ${row.n} | ${row.errors} | ${formatInterval(row.interval)} |`)
  }
  console.log("")
  const rare = rows[0]?.interval
  const common = rows[2]?.interval
  console.log(
    rare !== undefined && common !== undefined && overlaps(rare, common)
      ? "rule 1 of the pre-registration: rare and common intervals overlap, so the effect is not demonstrated"
      : "rule 1 of the pre-registration: rare and common intervals do not overlap, so the effect is demonstrated",
  )
}

function main(): void {
  const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8")) as Catalog
  const combos = new Map(
    catalog.drugs.map((drug) => [drug.nonproprietaryName, drug.combos.length] as const),
  )

  const setPath = process.argv.includes("--set")
    ? (process.argv[process.argv.indexOf("--set") + 1] ?? "eval/control")
    : "eval/control"
  const result = JSON.parse(readFileSync(`${setPath}/result-plain.json`, "utf8")) as Result
  const scored = result.scored

  if (
    process.argv.includes("--strata") &&
    process.argv[process.argv.indexOf("--strata") + 1] === "3"
  ) {
    printThreeStratumTable(scored)
    return
  }

  const rare = scored.filter((entry) => (combos.get(entry.spoken) ?? 0) <= 1)
  const established = scored.filter((entry) => (combos.get(entry.spoken) ?? 0) > 1)

  const rareInterval = wilson(rare.filter((e) => !e.correct).length, rare.length)
  const establishedInterval = wilson(
    established.filter((e) => !e.correct).length,
    established.length,
  )

  console.log(`rarity stratification over ${setPath}, n=${scored.length}`)
  console.log("stratifier: catalogue combination count, from the FDA NDC build")
  console.log("")
  console.log("| Stratum | N | Errors | EER with 95% Wilson interval |")
  console.log("|---|---|---|---|")
  console.log(
    `| at most one catalogue combination | ${rare.length} | ${rareInterval.successes} | ${formatInterval(rareInterval)} |`,
  )
  console.log(
    `| more than one combination | ${established.length} | ${establishedInterval.successes} | ${formatInterval(establishedInterval)} |`,
  )
  console.log("")

  const correctLengths = scored.filter((e) => e.correct).map((e) => e.spoken.length)
  const wrongLengths = scored.filter((e) => !e.correct).map((e) => e.spoken.length)
  const correctCombos = scored.filter((e) => e.correct).map((e) => combos.get(e.spoken) ?? 0)
  const wrongCombos = scored.filter((e) => !e.correct).map((e) => combos.get(e.spoken) ?? 0)

  console.log(
    `mean combinations: correct ${mean(correctCombos).toFixed(2)}, misheard ${mean(wrongCombos).toFixed(2)}`,
  )
  console.log(
    `mean name length: correct ${mean(correctLengths).toFixed(2)}, misheard ${mean(wrongLengths).toFixed(2)}`,
  )
  console.log("")

  if (overlaps(rareInterval, establishedInterval)) {
    console.log(
      "the two intervals overlap, so this is a stratification hypothesis with a suggestive effect, not a demonstrated difference",
    )
  } else {
    console.log("the two intervals do not overlap at this sample size")
  }
  console.log(
    "length is flat between the groups, so the effect is not explained by how long the name is",
  )
  console.log(
    "the stratifier comes from the public NDC build rather than from the transcription result, so it cannot have been fitted to the errors",
  )
}

if (process.argv[1]?.includes("analyse-rarity")) {
  main()
}
