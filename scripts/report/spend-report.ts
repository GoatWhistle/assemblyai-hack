#!/usr/bin/env -S npx tsx

import { readFileSync } from "node:fs"
import {
  parseLedger,
  RATE_USD_PER_HOUR,
  RATES_CHECKED_ON,
  RATES_SOURCE_URL,
  SPEND_METHOD_NOTE,
  SPEND_UNVERIFIABLE_NOTE,
  totalSpend,
} from "@/domain"

const LEDGER_PATH = "eval/spend-ledger.json"

type BalanceObservation = {
  readonly on: string
  readonly availableUsd: number
  readonly method: string
}

function balanceObservations(raw: unknown): readonly BalanceObservation[] {
  if (typeof raw !== "object" || raw === null) {
    return []
  }
  const list = (raw as { balanceObservations?: unknown }).balanceObservations
  if (!Array.isArray(list)) {
    return []
  }
  return list.filter(
    (entry): entry is BalanceObservation =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as BalanceObservation).on === "string" &&
      typeof (entry as BalanceObservation).availableUsd === "number" &&
      typeof (entry as BalanceObservation).method === "string",
  )
}

function main(): void {
  const raw: unknown = JSON.parse(readFileSync(LEDGER_PATH, "utf8"))
  const runs = parseLedger(raw)

  if (runs === null) {
    process.stderr.write(
      `${LEDGER_PATH} does not parse as a ledger of paid runs, so no spend figure can be derived from it\n`,
    )
    process.stderr.write("a malformed ledger must never read as zero spend\n")
    process.exit(1)
    return
  }

  process.stdout.write("What this project has spent on the paid API\n\n")
  process.stdout.write(`source: ${LEDGER_PATH}\n`)
  process.stdout.write("command: npx tsx scripts/report/spend-report.ts\n")
  process.stdout.write(`rates checked on ${RATES_CHECKED_ON} against ${RATES_SOURCE_URL}\n\n`)

  process.stdout.write("| Socket | USD per hour |\n|---|---|\n")
  for (const [socket, rate] of Object.entries(RATE_USD_PER_HOUR)) {
    process.stdout.write(`| ${socket} | ${rate.toFixed(2)} |\n`)
  }

  const total = totalSpend(runs)

  process.stdout.write(`\nrecorded paid runs: ${total.runCount}\n`)

  if (total.runCount === 0) {
    process.stdout.write(
      "\nno paid run has been recorded in the ledger, so this project publishes no spend figure.\n",
    )
    process.stdout.write(
      "that is the honest state, not a zero: a run that happened without being recorded here would\n",
    )
    process.stdout.write(
      "make any total below an understatement, so the total is withheld rather than guessed.\n",
    )
  } else {
    process.stdout.write(`runs that did not complete, still billed: ${total.failedRunCount}\n`)
    process.stdout.write(`total socket-open time: ${total.totalSeconds} s\n`)
    process.stdout.write("\n| Run | Command | Rate per hour | USD |\n|---|---|---|---|\n")
    for (const run of runs) {
      const cost = total.perRun.find((entry) => entry.runId === run.runId)
      process.stdout.write(
        `| ${run.runId} | ${run.command} | ${cost?.ratePerHour.toFixed(2) ?? "?"} | ${cost?.usd.toFixed(4) ?? "?"} |\n`,
      )
    }
    process.stdout.write(`\nderived total: USD ${total.usd.toFixed(4)}\n`)
  }

  const observations = balanceObservations(raw)
  process.stdout.write("\nBalance, the one figure a human verified against the vendor:\n")
  if (observations.length === 0) {
    process.stdout.write("  none recorded\n")
  } else {
    for (const observation of observations) {
      process.stdout.write(
        `  ${observation.on}: USD ${observation.availableUsd.toFixed(2)} available, ${observation.method}\n`,
      )
    }
  }

  process.stdout.write(`\nmethod: ${SPEND_METHOD_NOTE}\n`)
  process.stdout.write(`limit: ${SPEND_UNVERIFIABLE_NOTE}\n`)
}

main()
