#!/usr/bin/env -S npx tsx

import {
  breachesTheBuild,
  countExceedances,
  type Exceedance,
  exceedanceVerdict,
  LATENCY_BUDGET_CHECKED_ON,
  LATENCY_BUDGET_GATING_NOTE,
  LATENCY_BUDGET_MS,
  LATENCY_BUDGET_RATIONALE,
  type LatencyMetric,
} from "@/domain"
import { cleanTimingsAcross, type RecordedTiming } from "../eer/artefact"
import { gateLatencyOverFixtures } from "./measure-gate-latency"

const RECORDED_SETS: readonly string[] = [
  "eval/control/result-plain.json",
  "eval/native16/result-plain.json",
]

function cleanResults(paths: readonly string[] = RECORDED_SETS): readonly RecordedTiming[] {
  return cleanTimingsAcross(paths)
}

export function samplesFor(
  metric: LatencyMetric,
  results: readonly RecordedTiming[] = cleanResults(),
): readonly number[] {
  if (metric === "finalization") {
    return results
      .map((entry) => entry.finalizationMs)
      .filter((value): value is number => value !== null)
  }
  if (metric === "socketOpen") {
    return results.map((entry) => entry.openMs)
  }
  return gateLatencyOverFixtures()
}

export function allExceedances(): readonly Exceedance[] {
  const results = cleanResults()
  return (Object.keys(LATENCY_BUDGET_MS) as readonly LatencyMetric[]).map((metric) =>
    countExceedances(metric, samplesFor(metric, results)),
  )
}

function formatMs(exceedance: Exceedance, value: number): string {
  return exceedance.metric === "gateDecision" ? value.toFixed(3) : String(Math.round(value))
}

function main(): void {
  const exceedances = allExceedances()

  process.stdout.write("Latency budget, and how often it was exceeded\n\n")
  process.stdout.write("command: npx tsx scripts/measure/latency-budget.ts\n")
  process.stdout.write(`budgets checked on ${LATENCY_BUDGET_CHECKED_ON}\n`)
  process.stdout.write(`recorded runs read: ${RECORDED_SETS.join(", ")}\n`)
  process.stdout.write(`gating rule: ${LATENCY_BUDGET_GATING_NOTE}\n\n`)

  process.stdout.write("| Metric | Budget | Origin | Gates build | N | Over budget | Worst |\n")
  process.stdout.write("|---|---|---|---|---|---|---|\n")
  for (const entry of exceedances) {
    process.stdout.write(
      `| ${entry.metric} | ${entry.budgetMs} ms | ${entry.origin} | ${entry.gating ? "yes" : "no"} | ${entry.observations} | ${entry.overBudget} | ${formatMs(entry, entry.worstMs)} ms |\n`,
    )
  }

  process.stdout.write("\n")
  let empty = 0
  let breached = 0
  for (const entry of exceedances) {
    process.stdout.write(`${entry.metric}: ${exceedanceVerdict(entry)}\n`)
    process.stdout.write(`  why this budget: ${LATENCY_BUDGET_RATIONALE[entry.metric]}\n`)
    if (entry.observations === 0) {
      empty += 1
    }
    if (entry.overBudget > 0) {
      process.stdout.write(
        `  over budget, worst first: ${entry.overBudgetValuesMs.map((value) => formatMs(entry, value)).join(", ")} ms\n`,
      )
    }
    if (breachesTheBuild(entry)) {
      breached += 1
    }
  }

  process.stdout.write(
    "\nturn-to-turn latency is not in this table because it needs a live agent socket and a public host for the tool webhooks; it stays not measured rather than borrowing a number from a metric that was measured\n",
  )

  if (empty > 0) {
    process.stderr.write(
      `\n${empty} of ${exceedances.length} metrics had no observation at all. A budget with no samples is a claim and not a guard, so this refuses rather than printing a table of zeroes.\n`,
    )
    process.exit(1)
    return
  }

  if (breached > 0) {
    process.stderr.write(
      `\n${breached} gating budget was exceeded. A budget nobody fails on is a claim, so this exits non-zero.\n`,
    )
    process.exit(1)
    return
  }

  process.stdout.write("\nevery gating budget held on every recorded observation\n")
}

if (process.argv[1]?.includes("latency-budget")) {
  main()
}
