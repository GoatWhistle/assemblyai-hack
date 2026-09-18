#!/usr/bin/env -S npx tsx

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { normalizeStrength } from "../../src/sessions/normalize-value"
import { formatInterval, wilson } from "../../src/stats/wilson"
import { type ManifestItem, transcribeItem } from "../eer/transcribe"

const SPACING_MS = Number(process.env.EER_SPACING_MS ?? 24000)
const CARRIER = /^the strength is\s+/i
const TRAILING = /[.\s]+$/

type Manifest = {
  readonly method: string
  readonly caveat: string
  readonly items: readonly ManifestItem[]
}

type Outcome = {
  readonly expected: string
  readonly transcript: string
  readonly normalised: string | null
  readonly correct: boolean
  readonly unitClassWrong: boolean
  readonly minConfidence: number
  readonly closeCode: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms))
}

function strengthFrom(transcript: string): string | null {
  const stripped = transcript.replace(CARRIER, "").replace(TRAILING, "")
  return normalizeStrength(stripped)
}

function unitOf(value: string): string {
  return value.split(" ")[1] ?? ""
}

async function main(): Promise<void> {
  const setPath = "eval/units"
  const manifestPath = resolve(setPath, "manifest.json")
  if (!existsSync(manifestPath)) {
    console.error(`${manifestPath} does not exist; run make corpus-units first`)
    process.exit(1)
  }

  const key = process.env.ASSEMBLYAI_API_KEY
  if (key === undefined || key.trim().length === 0) {
    console.error(
      "ASSEMBLYAI_API_KEY is not set. This target opens a paid recognizer socket per item, so it refuses rather than reporting a number it did not measure.",
    )
    process.exit(1)
  }

  const raw = readFileSync(manifestPath, "utf8")
  const manifest = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw) as Manifest

  console.log(`unit-class confusion over ${manifest.items.length} utterances`)
  console.log(`  method: ${manifest.method}`)
  console.log(`  caveat: ${manifest.caveat}`)
  console.log("")

  const outcomes: Outcome[] = []
  for (const [index, item] of manifest.items.entries()) {
    const result = await transcribeItem(item, key, [])
    const normalised = strengthFrom(result.transcript)
    const confidences = result.words.map((word) => word.confidence)
    const correct = normalised === item.spoken
    outcomes.push({
      expected: item.spoken,
      transcript: result.transcript,
      normalised,
      correct,
      unitClassWrong: normalised !== null && unitOf(normalised) !== unitOf(item.spoken),
      minConfidence: confidences.length === 0 ? 0 : Math.min(...confidences),
      closeCode: result.closeCode,
    })
    console.log(
      `  ${index + 1}/${manifest.items.length} ${item.spoken} -> ${normalised ?? "(not parsed)"}${correct ? "" : "  MISMATCH"}`,
    )
    if (index < manifest.items.length - 1) {
      await sleep(SPACING_MS)
    }
  }

  const wrong = outcomes.filter((entry) => !entry.correct)
  const unitWrong = outcomes.filter((entry) => entry.unitClassWrong)
  const interval = wilson(wrong.length, outcomes.length)

  console.log("")
  console.log("| Figure | Value |")
  console.log("|---|---|")
  console.log(`| utterances | ${outcomes.length} |`)
  console.log(
    `| strength not recovered exactly, 95% Wilson | **${formatInterval(interval)}** |`,
  )
  console.log(
    `| wrong unit class, the thousandfold error | **${unitWrong.length} of ${outcomes.length}** |`,
  )
  console.log(`| close codes | ${[...new Set(outcomes.map((o) => o.closeCode))].join(", ")} |`)

  if (wrong.length > 0) {
    console.log("")
    console.log("mismatches:")
    for (const entry of wrong) {
      console.log(
        `  expected ${entry.expected}, parsed ${entry.normalised ?? "(nothing)"} from "${entry.transcript}" at ${entry.minConfidence.toFixed(3)}`,
      )
    }
  }

  writeFileSync(
    resolve(setPath, "result-plain.json"),
    `${JSON.stringify({ measuredAt: new Date().toISOString(), spacingMs: SPACING_MS, outcomes }, null, 2)}\n`,
    "utf8",
  )
  console.log("")
  console.log(`raw results: ${setPath}/result-plain.json`)
}

if (process.argv[1]?.includes("measure-units")) {
  void main()
}
