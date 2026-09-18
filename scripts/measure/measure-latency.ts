#!/usr/bin/env -S npx tsx

import { gateLatencyOverFixtures, percentile } from "./measure-gate-latency"
import { costEstimate, preflight, spacingNote } from "./measure-guard"

function parseRuns(): number {
  const flag = process.argv.indexOf("--runs")
  if (flag === -1) {
    return 30
  }
  return Number(process.argv[flag + 1])
}

function reportOffline(): void {
  const samples = gateLatencyOverFixtures()
  if (samples.length === 0) {
    console.error("no fixture produced a gate decision; nothing to measure")
    process.exit(1)
  }

  const sorted = [...samples].sort((a, b) => a - b)
  console.log(`decision latency of the gate itself, over ${samples.length} candidates`)
  console.log("measured locally: no socket, no credit, no recognizer involved")
  console.log("")
  console.log("| Metric | N | P50 | P95 | Max |")
  console.log("|---|---|---|---|---|")
  console.log(
    `| word span to gate decision | ${samples.length} | ${percentile(sorted, 50).toFixed(3)} ms | ${percentile(sorted, 95).toFixed(3)} ms | ${sorted[sorted.length - 1]?.toFixed(3)} ms |`,
  )
  console.log("")
  console.log(
    "this is the decision function only. Turn-to-turn latency, time to first audio and finalization delay all need live sockets and stay 'not measured' in eval/REPORT.md.",
  )
}

function main(): void {
  const runs = parseRuns()
  const check = preflight(runs)

  reportOffline()

  if (!check.ready) {
    console.log("")
    console.log("live percentiles were not attempted:")
    console.log(`  ${check.reason}`)
    console.log(`  when a key exists: ${spacingNote(runs)}; ${costEstimate(runs)}`)
    return
  }

  console.log("")
  console.log(
    "a key is present, but the live path needs a recorded microphone source and a public host for the tool webhooks; those rows stay unmeasured rather than carrying a fabricated number.",
  )
}

main()
