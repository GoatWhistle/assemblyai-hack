#!/usr/bin/env -S npx tsx

import { type AbCase, buildAbCorpus } from "./ab-corpus"
import { type AbOutcome, runAbCase, summarise } from "./ab-report"

function parseSeed(): number {
  const flag = process.argv.indexOf("--seed")
  if (flag === -1) {
    return 20260916
  }
  const value = Number(process.argv[flag + 1])
  return Number.isFinite(value) ? value : 20260916
}

function main(): void {
  const seed = parseSeed()
  const corpus: readonly AbCase[] = buildAbCorpus(seed)

  const withGate: AbOutcome[] = []
  const withoutGate: AbOutcome[] = []

  for (const entry of corpus) {
    withGate.push(runAbCase(entry, true))
    withoutGate.push(runAbCase(entry, false))
  }

  const on = summarise(withGate)
  const off = summarise(withoutGate)

  console.log(`corpus: ${corpus.length} candidates, seed ${seed}`)
  console.log(`  ${on.correctValues} carry the value the human actually said`)
  console.log(`  ${on.mishearings} carry a recognizer mishearing`)
  console.log("")
  console.log("| Configuration | Wrong values written | Caught | False asks | Ask rate |")
  console.log("|---|---|---|---|---|")
  for (const [label, s] of [
    ["gate on", on],
    ["gate off", off],
  ] as const) {
    console.log(
      `| ${label} | ${s.wrongWritten} | ${s.caught}/${on.mishearings} | ${s.falseAsks}/${on.correctValues} | ${(s.askRate * 100).toFixed(1)}% |`,
    )
  }
  console.log("")
  console.log(
    `false-ask rate, gate on: ${((on.falseAsks / on.correctValues) * 100).toFixed(1)}% (${on.falseAsks} of ${on.correctValues} already-correct values were re-asked)`,
  )

  if (off.wrongWritten <= on.wrongWritten) {
    console.error("")
    console.error(
      `the gate did not reduce wrong values written (${on.wrongWritten} with it, ${off.wrongWritten} without); the comparison is not demonstrating anything`,
    )
    process.exit(1)
  }
}

main()
