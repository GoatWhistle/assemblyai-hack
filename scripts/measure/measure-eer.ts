#!/usr/bin/env -S npx tsx

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { buildKeyterms } from "../../src/lasa"
import { printReport } from "../eer/report"
import {
  inManifestOrder,
  type PartialRun,
  pendingItems,
  readPartial,
  withFailure,
  withResult,
  writePartial,
} from "../eer/resume"
import { describeFailure } from "../eer/retry"
import { entityErrorRate, score } from "../eer/score"
import { type ManifestItem, type TranscriptResult, transcribeItem } from "../eer/transcribe"
import { appendPaidRun, paidRunOf } from "../report/record-spend"

const SPACING_MS = Number(process.env.EER_SPACING_MS ?? 24000)

type Manifest = {
  readonly method: string
  readonly caveat: string
  readonly count: number
  readonly items: readonly ManifestItem[]
}

function parseFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback)
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms))
}

export function resultFileName(withKeyterms: boolean, repeat: number): string {
  const stem = withKeyterms ? "result-keyterms" : "result-plain"
  return repeat <= 1 ? `${stem}.json` : `${stem}-run${repeat}.json`
}

function readManifest(path: string): Manifest {
  const raw = readFileSync(path, "utf8")
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw) as Manifest
}

function requireKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY
  if (key === undefined || key.trim().length === 0) {
    console.error("")
    console.error(
      "ASSEMBLYAI_API_KEY is not set. This target opens a paid recognizer socket per item, so it refuses rather than reporting a number it did not measure.",
    )
    process.exit(1)
  }
  return key
}

export type SweepDeps = {
  readonly transcribe: (
    item: ManifestItem,
    key: string,
    keyterms: readonly string[],
  ) => Promise<TranscriptResult>
  readonly sleep: (ms: number) => Promise<void>
  readonly log: (line: string) => void
  readonly spacingMs: number
}

const SWEEP_DEPS: SweepDeps = {
  transcribe: (item, key, keyterms) => transcribeItem(item, key, keyterms),
  sleep,
  log: (line) => console.log(line),
  spacingMs: SPACING_MS,
}

export async function transcribeAll(
  items: readonly ManifestItem[],
  key: string,
  keyterms: readonly string[],
  partialPath: string,
  deps: SweepDeps = SWEEP_DEPS,
): Promise<PartialRun> {
  let run = readPartial(partialPath)
  const pending = pendingItems(items, run)
  const resumed = items.length - pending.length
  if (resumed > 0) {
    deps.log(
      `  resumed ${resumed} scored item(s) from ${partialPath}; ${pending.length} remaining`,
    )
  }
  for (const [index, item] of pending.entries()) {
    const position = `${resumed + index + 1}/${items.length}`
    try {
      const result = await deps.transcribe(item, key, keyterms)
      run = withResult(run, result)
      deps.log(
        `  ${position} ${item.spoken} -> ${result.transcript.length === 0 ? "(empty)" : result.transcript}`,
      )
    } catch (error) {
      run = withFailure(run, item, error)
      deps.log(`  ${position} ${item.spoken} -> FAILED, recorded: ${describeFailure(error)}`)
    }
    writePartial(partialPath, run)
    if (index < pending.length - 1) {
      await deps.sleep(deps.spacingMs)
    }
  }
  return { results: inManifestOrder(items, run.results), failed: run.failed }
}

async function main(): Promise<void> {
  const setPath = parseFlag("--set", "eval/dev")
  const withKeyterms = process.argv.includes("--keyterms")
  const repeat = Number(parseFlag("--repeat", "1"))
  const limit = Number(parseFlag("--limit", "0"))
  const manifestPath = resolve(setPath, parseFlag("--manifest", "manifest.json"))

  console.log(`entity error rate over ${setPath}`)

  if (!existsSync(manifestPath)) {
    console.error(`${manifestPath} does not exist; build a labelled set before measuring`)
    process.exit(1)
  }

  const manifest = readManifest(manifestPath)
  const items = limit > 0 ? manifest.items.slice(0, limit) : manifest.items

  if (items.length === 0) {
    console.error(
      `${setPath} carries no items. A set nobody labelled cannot support any claim, so this refuses rather than reporting a rate over nothing.`,
    )
    process.exit(1)
  }

  const outPath = resolve(setPath, resultFileName(withKeyterms, repeat))
  if (existsSync(outPath)) {
    console.error(
      `${outPath} already holds a recorded run. Overwriting it would destroy the only evidence of how far a figure moves between two runs of the same input, which is the point of measuring reproducibility at all. Pass --repeat <n> with an unused number. This refuses before opening a socket, so nothing is billed.`,
    )
    process.exit(1)
  }

  const key = requireKey()
  const keyterms = withKeyterms ? buildKeyterms() : []

  console.log(`  items: ${items.length}`)
  console.log(`  spacing: ${SPACING_MS} ms between sessions`)
  console.log(
    `  keyterms: ${keyterms.length === 0 ? "none" : `${keyterms.length} identity terms`}`,
  )
  console.log(`  method: ${manifest.method}`)
  console.log(`  caveat: ${manifest.caveat}`)
  console.log("")

  const partialPath = outPath.replace(/\.json$/, ".partial.json")
  const { results, failed } = await transcribeAll(items, key, keyterms, partialPath)
  const socketMs = results.reduce((sum, result) => sum + result.socketMs, 0)
  appendPaidRun(
    paidRunOf({
      command: `scripts/measure/measure-eer.ts --set ${setPath}`,
      sockets: ["stt"],
      openedAtMs: 0,
      closedAtMs: socketMs,
      outcome:
        failed.length === 0 && results.every((result) => result.closeCode === 1000)
          ? "completed"
          : "failed",
      nowIso: new Date().toISOString(),
    }),
  )
  console.log(
    `spend recorded: ${(socketMs / 1000).toFixed(1)} s of STT socket time in eval/spend-ledger.json, summed over every scored item including resumed ones`,
  )
  if (failed.length > 0) {
    console.log(
      `${failed.length} item(s) failed after retries and are excluded from every rate below; they are listed under "failed" in the result file`,
    )
  }
  const scored = score(results)
  printReport(scored, results)

  writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        setPath,
        repeat,
        spacingMs: SPACING_MS,
        keyterms: keyterms.length,
        entityErrorRate: entityErrorRate(scored),
        itemsFailed: failed.length,
        results,
        scored,
        failed,
      },
      null,
      2,
    )}\n`,
    "utf8",
  )
  rmSync(partialPath, { force: true })
  console.log("")
  console.log(
    `raw results: ${outPath}; the resume checkpoint ${partialPath} is removed once the result is written`,
  )
}

if (process.argv[1]?.includes("measure-eer")) {
  void main()
}
