#!/usr/bin/env -S npx tsx

import { existsSync, readFileSync } from "node:fs"
import { formatInterval, wilson } from "../../src/stats/wilson"

type Scored = {
  readonly spoken: string
  readonly heard: string
  readonly correct: boolean
  readonly minConfidence: number
}

type Result = { readonly scored: readonly Scored[] }

export type { Scored }

const BINS: readonly { readonly label: string; readonly low: number; readonly high: number }[] =
  [
    { label: "0.99 and above", low: 0.99, high: 1.01 },
    { label: "0.95 to 0.99", low: 0.95, high: 0.99 },
    { label: "0.90 to 0.95", low: 0.9, high: 0.95 },
    { label: "0.80 to 0.90", low: 0.8, high: 0.9 },
    { label: "below 0.80", low: 0, high: 0.8 },
  ]

const MIN_BIN = 5

export function loadSets(paths: readonly string[]): readonly Scored[] {
  const all: Scored[] = []
  for (const path of paths) {
    const file = `${path}/result-plain.json`
    if (!existsSync(file)) {
      continue
    }
    const result = JSON.parse(readFileSync(file, "utf8")) as Result
    all.push(...result.scored)
  }
  return all
}

function main(): void {
  const sets = process.argv.includes("--set")
    ? [process.argv[process.argv.indexOf("--set") + 1] ?? "eval/control"]
    : ["eval/control", "eval/dev", "eval/native16"]

  const scored = loadSets(sets)
  if (scored.length === 0) {
    console.error("no recorded runs were found; run make eval-control first")
    process.exit(1)
  }

  console.log(`confidence calibration over ${scored.length} recorded utterances`)
  console.log(`sets: ${sets.join(", ")}`)
  console.log("")
  console.log("| Reported confidence | N | Heard correctly | Observed accuracy, 95% Wilson |")
  console.log("|---|---|---|---|")

  let thin = 0
  for (const bin of BINS) {
    const inBin = scored.filter(
      (entry) => entry.minConfidence >= bin.low && entry.minConfidence < bin.high,
    )
    if (inBin.length === 0) {
      console.log(`| ${bin.label} | 0 | — | no observations |`)
      continue
    }
    const correct = inBin.filter((entry) => entry.correct).length
    const interval = wilson(correct, inBin.length)
    const note = inBin.length < MIN_BIN ? " (too few to read)" : ""
    if (inBin.length < MIN_BIN) {
      thin += 1
    }
    console.log(
      `| ${bin.label} | ${inBin.length} | ${correct} | ${formatInterval(interval)}${note} |`,
    )
  }

  const high = scored.filter((entry) => entry.minConfidence >= 0.95)
  const wrongHigh = high.filter((entry) => !entry.correct)
  console.log("")
  console.log(
    `at or above the 0.95 drugName threshold: ${high.length} utterances, ${wrongHigh.length} of them misheard`,
  )
  for (const entry of wrongHigh) {
    console.log(
      `  ${entry.spoken} heard as ${entry.heard} at ${entry.minConfidence.toFixed(3)}`,
    )
  }
  console.log("")
  console.log(
    "a bin whose accuracy is below one while its reported confidence is near one is the product's claim, measured: the number describes how clearly a sound was heard, not whether it was the right word",
  )
  if (thin > 0) {
    console.log(
      `${thin} bins hold fewer than ${MIN_BIN} observations and are printed rather than plotted, because a rate over four items is not a rate`,
    )
  }
}

main()
