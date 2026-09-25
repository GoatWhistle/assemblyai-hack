#!/usr/bin/env -S npx tsx

import { type AbCase, buildAbCorpus } from "../arms/ab-corpus"
import { type AbSummary, runAbCase, summarise } from "../arms/ab-report"
import { ARMS, type ArmId } from "../arms/shipped-policy"

function parseSeed(): number {
  const flag = process.argv.indexOf("--seed")
  if (flag === -1) {
    return 20260916
  }
  const value = Number(process.argv[flag + 1])
  return Number.isFinite(value) ? value : 20260916
}

export function summariesFor(corpus: readonly AbCase[]): ReadonlyMap<ArmId, AbSummary> {
  return new Map(
    ARMS.map((arm) => [arm.id, summarise(corpus.map((entry) => runAbCase(entry, arm.policy)))]),
  )
}

function main(): void {
  const seed = parseSeed()
  const corpus = buildAbCorpus(seed)
  const summaries = summariesFor(corpus)
  const shipped = summaries.get("shipped")
  const withoutPair = summaries.get("without_pair_rule")
  if (shipped === undefined || withoutPair === undefined) {
    process.exit(1)
    return
  }

  console.log(`corpus: ${corpus.length} candidates, seed ${seed}`)
  console.log(`  ${shipped.correctValues} carry the value the human actually said`)
  console.log(`  ${shipped.mishearings} carry a recognizer mishearing inside a curated pair`)
  console.log("")
  console.log(
    "| Arm | Wrong values written unasked | Wrong values a reflex yes writes | Mishearings put to a contrastive question | Correct values asked | Contrastive asks on correct values | Threshold asks on correct values | Standing read-backs on correct values |",
  )
  console.log("|---|---|---|---|---|---|---|---|")
  for (const arm of ARMS) {
    const s = summaries.get(arm.id)
    if (s === undefined) {
      continue
    }
    console.log(
      `| ${arm.label} | ${s.writtenUnasked} | ${s.reflexWrites}/${s.mishearings} | ${s.contrastiveOnErrors}/${s.mishearings} | ${s.askedCorrect}/${s.correctValues} | ${s.contrastiveOnCorrect}/${s.correctValues} | ${s.thresholdOnCorrect}/${s.correctValues} | ${s.standingOnCorrect}/${s.correctValues} |`,
    )
  }
  console.log("")
  console.log(
    "a reflex yes is a caller agreeing to whatever was read back; it writes a value asked by the threshold or by the standing read-back, and never one asked by the pair rule, which needs the caller to say a name",
  )
  console.log(
    `the pair rule is the only difference between the first two arms: ${withoutPair.reflexWrites} of ${withoutPair.mishearings} mishearings a reflex yes would write without it, ${shipped.reflexWrites} with it, at a cost of ${shipped.contrastiveOnCorrect} contrastive questions on ${shipped.correctValues} correct values`,
  )

  if (shipped.reflexWrites >= withoutPair.reflexWrites) {
    console.error("")
    console.error(
      `the pair rule did not reduce what a reflex yes writes (${shipped.reflexWrites} with it, ${withoutPair.reflexWrites} without); the comparison is not demonstrating anything`,
    )
    process.exit(1)
  }
}

if (process.argv[1]?.includes("ab-gate")) {
  main()
}
