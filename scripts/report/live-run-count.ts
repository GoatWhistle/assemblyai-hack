#!/usr/bin/env -S npx tsx

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseLedger, ratePerHourFor } from "@/domain"

const HONEST_COUNT_RULE =
  "a paid call that failed still cost money and still happened. This counts sessions from the artefacts each run left behind, so a run cannot be omitted by forgetting to record it, and it names what the artefacts cannot show"

export const LEDGER_PATH = "eval/spend-ledger.json"

export type ArtefactRun = {
  readonly setPath: string
  readonly file: string
  readonly measuredAt: string | null
  readonly sessions: number
  readonly cleanCloses: number
  readonly rateLimited: number
  readonly otherCloses: number
  readonly socketSeconds: number | null
  readonly socketSecondsKnown: boolean
}

type Entry = { readonly closeCode?: number; readonly socketMs?: number }

type ResultFile = {
  readonly measuredAt?: string
  readonly results?: readonly Entry[]
  readonly scored?: readonly Entry[]
  readonly outcomes?: readonly Entry[]
}

const ARTEFACTS: readonly string[] = [
  "eval/dev/result-plain.json",
  "eval/control/result-plain.json",
  "eval/native16/result-plain.json",
  "eval/units/result-plain.json",
  "eval/heldout/result-plain.json",
  "eval/dev/result-keyterms.json",
  "eval/control/result-plain-run2.json",
  "eval/native16/result-plain-run2.json",
  "eval/dev/result-plain-run2.json",
]

export const DISCARDED_RUNS: readonly ArtefactRun[] = [
  {
    setPath: "eval/dev",
    file: "not kept: overwritten by the re-run at 24 s spacing",
    measuredAt: "2026-09-16",
    sessions: 40,
    cleanCloses: 19,
    rateLimited: 21,
    otherCloses: 0,
    socketSeconds: null,
    socketSecondsKnown: false,
  },
  {
    setPath: "eval/dev",
    file: "not kept: four files re-run to test the rate-limiter explanation",
    measuredAt: "2026-09-16",
    sessions: 4,
    cleanCloses: 4,
    rateLimited: 0,
    otherCloses: 0,
    socketSeconds: null,
    socketSecondsKnown: false,
  },
]

const DISCARDED_PROVENANCE =
  "these two runs left no artefact because the first was overwritten before this project refused to overwrite a recorded run. Their session counts and close codes are taken from the account of them in eval/REPORT.md, which is weaker evidence than a file, and the report says so where the 52.5% appears. Their socket seconds were never recorded, so their cost is unknown rather than zero"

function entriesOf(parsed: ResultFile): readonly Entry[] {
  if (parsed.results !== undefined && parsed.results.length > 0) {
    return parsed.results
  }
  if (parsed.outcomes !== undefined && parsed.outcomes.length > 0) {
    return parsed.outcomes
  }
  return parsed.scored ?? []
}

function readArtefact(path: string): ArtefactRun | null {
  const full = resolve(path)
  if (!existsSync(full)) {
    return null
  }
  const parsed = JSON.parse(readFileSync(full, "utf8")) as ResultFile
  const entries = entriesOf(parsed)
  const withSocket = entries.filter((entry) => typeof entry.socketMs === "number")
  return {
    setPath: path.split("/").slice(0, 2).join("/"),
    file: path,
    measuredAt: parsed.measuredAt ?? null,
    sessions: entries.length,
    cleanCloses: entries.filter((entry) => entry.closeCode === 1000).length,
    rateLimited: entries.filter((entry) => entry.closeCode === 1008).length,
    otherCloses: entries.filter(
      (entry) =>
        entry.closeCode !== undefined && entry.closeCode !== 1000 && entry.closeCode !== 1008,
    ).length,
    socketSeconds:
      withSocket.length === entries.length && entries.length > 0
        ? Math.round(withSocket.reduce((sum, entry) => sum + (entry.socketMs ?? 0), 0) / 100) /
          10
        : null,
    socketSecondsKnown: withSocket.length === entries.length && entries.length > 0,
  }
}

export function artefactRuns(): readonly ArtefactRun[] {
  return ARTEFACTS.map(readArtefact).filter((run): run is ArtefactRun => run !== null)
}

export type HonestCount = {
  readonly runs: number
  readonly sessions: number
  readonly cleanCloses: number
  readonly rateLimited: number
  readonly otherCloses: number
  readonly knownSocketSeconds: number
  readonly runsWithUnknownDuration: number
  readonly sessionsWithUnknownDuration: number
}

export function honestCount(runs: readonly ArtefactRun[]): HonestCount {
  return {
    runs: runs.length,
    sessions: runs.reduce((sum, run) => sum + run.sessions, 0),
    cleanCloses: runs.reduce((sum, run) => sum + run.cleanCloses, 0),
    rateLimited: runs.reduce((sum, run) => sum + run.rateLimited, 0),
    otherCloses: runs.reduce((sum, run) => sum + run.otherCloses, 0),
    knownSocketSeconds:
      Math.round(runs.reduce((sum, run) => sum + (run.socketSeconds ?? 0), 0) * 10) / 10,
    runsWithUnknownDuration: runs.filter((run) => !run.socketSecondsKnown).length,
    sessionsWithUnknownDuration: runs
      .filter((run) => !run.socketSecondsKnown)
      .reduce((sum, run) => sum + run.sessions, 0),
  }
}

function printTable(runs: readonly ArtefactRun[]): void {
  process.stdout.write(
    "| Run | When | Sessions | Closed 1000 | Closed 1008 | Other | Socket time |\n",
  )
  process.stdout.write("|---|---|---|---|---|---|---|\n")
  for (const run of runs) {
    const duration = run.socketSecondsKnown ? `${run.socketSeconds} s` : "not recorded"
    process.stdout.write(
      `| ${run.file} | ${run.measuredAt ?? "unrecorded"} | ${run.sessions} | ${run.cleanCloses} | ${run.rateLimited} | ${run.otherCloses} | ${duration} |\n`,
    )
  }
}

function main(): void {
  const kept = artefactRuns()
  const all = [...kept, ...DISCARDED_RUNS]
  const total = honestCount(all)

  process.stdout.write("An honest count of the paid runs that actually happened\n\n")
  process.stdout.write("command: npx tsx scripts/report/live-run-count.ts\n")
  process.stdout.write(`rule: ${HONEST_COUNT_RULE}\n\n`)

  process.stdout.write("Runs that left an artefact in this repository:\n")
  printTable(kept)

  process.stdout.write("\nRuns that left no artefact, counted anyway:\n")
  printTable(DISCARDED_RUNS)
  process.stdout.write(`\nwhy their evidence is weaker: ${DISCARDED_PROVENANCE}\n`)

  process.stdout.write(
    `\ntotal paid runs: ${total.runs}\ntotal paid sessions opened: ${total.sessions}\n`,
  )
  process.stdout.write(
    `sessions that closed 1000: ${total.cleanCloses}\nsessions the rate limiter closed with 1008, billed regardless: ${total.rateLimited}\nsessions with another close code: ${total.otherCloses}\n`,
  )
  process.stdout.write(
    `\nsocket time recorded: ${total.knownSocketSeconds} s over ${total.runs - total.runsWithUnknownDuration} of ${total.runs} runs\n`,
  )
  process.stdout.write(
    `socket time never recorded: ${total.runsWithUnknownDuration} runs covering ${total.sessionsWithUnknownDuration} sessions, so their cost is unknown and is not imputed\n`,
  )

  const sttRate = ratePerHourFor(["stt"])
  process.stdout.write(
    `\nthe recorded socket time alone, at USD ${sttRate.toFixed(2)} per hour for one streaming socket, is USD ${((total.knownSocketSeconds / 3600) * sttRate).toFixed(4)}. That is a floor and not the bill: ${total.sessionsWithUnknownDuration} sessions have no duration on record, so the true figure is higher by an amount nobody wrote down.\n`,
  )

  const ledger = parseLedger(JSON.parse(readFileSync(LEDGER_PATH, "utf8")))
  if (ledger === null) {
    process.stderr.write(
      `\n${LEDGER_PATH} does not parse, so the reconciliation cannot be done and this refuses rather than reporting agreement it did not check\n`,
    )
    process.exit(1)
    return
  }
  process.stdout.write(
    `\nReconciliation against ${LEDGER_PATH}: the ledger holds ${ledger.length} run${ledger.length === 1 ? "" : "s"} against the ${total.runs} counted here.\n`,
  )
  if (ledger.length < total.runs) {
    process.stdout.write(
      `The ledger is behind by ${total.runs - ledger.length}. It was added after these runs were made, so it records none of them; that gap is stated rather than closed by back-filling entries whose socket clocks nobody kept. Runs made from now on are recorded by scripts/report/record-spend.ts at the time they happen.\n`,
    )
  }
}

if (process.argv[1]?.includes("live-run-count")) {
  main()
}
