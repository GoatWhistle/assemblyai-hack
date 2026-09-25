#!/usr/bin/env -S npx tsx

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { LiveManifest } from "../build/live-set"
import {
  identifierPauses,
  keytermsAblation,
  type LiveResultFile,
  NOT_MEASURED,
  summariseLive,
} from "../live/live-analysis"

export const LIVE_MANIFEST_PATH = "eval/live/manifest.json"
export const LIVE_PLAIN_RESULT = "eval/live/result-plain.json"
export const LIVE_HINTED_RESULT = "eval/live/result-lasa-keyterms.json"

function readJson<T>(path: string): T | null {
  return existsSync(resolve(path))
    ? (JSON.parse(readFileSync(resolve(path), "utf8")) as T)
    : null
}

export function liveReport(
  manifest: LiveManifest | null,
  plain: LiveResultFile | null,
  hinted: LiveResultFile | null,
): string {
  const lines: string[] = []
  const present = manifest?.present ?? 0
  const count = manifest?.count ?? 75
  if (manifest === null || plain === null) {
    lines.push(`human voices: ${NOT_MEASURED} (${present} of ${count} audio files present)`)
    lines.push(`pauses between identifier digit groups: ${NOT_MEASURED}`)
    lines.push(`keyterms ablation on human voices: ${NOT_MEASURED}`)
    return lines.join("\n")
  }
  const summary = summariseLive(manifest.items, plain.results)
  lines.push(`human voices, measured ${plain.measuredAt}, ${summary.drugN} drug utterances`)
  lines.push(`entity error rate, 95% Wilson: ${summary.overall}`)
  for (const row of summary.perSpeaker) {
    lines.push(`  speaker ${row.speaker}, n=${row.n}: ${row.line}`)
  }
  lines.push(`natural LASA mishearings: ${summary.naturalLasaMishearings}`)
  for (const failure of summary.failures) {
    lines.push(
      `  FAILURE ${failure.id}: said ${failure.expected}, heard ${failure.heard || "(nothing)"} at ${failure.minConfidence ?? "no"} confidence`,
    )
  }
  lines.push(
    `identifiers read back digit for digit: ${summary.identifierCorrect} of ${summary.identifierN}`,
  )
  lines.push(
    `false confirmations on non-commands: ${summary.falseConfirmations} of ${summary.nonCommandN}`,
  )
  const pauses = identifierPauses(manifest.items, plain.results)
  lines.push(
    `pauses between identifier digit groups: n=${pauses.n}, p50 ${pauses.p50 ?? "-"} ms, p95 ${pauses.p95 ?? "-"} ms, max ${pauses.max ?? "-"} ms, ${pauses.overDefaultMinTurnSilence} above 400 ms`,
  )
  if (hinted === null) {
    lines.push(`keyterms ablation on human voices: ${NOT_MEASURED}`)
  } else {
    const ablation = keytermsAblation(manifest.items, plain.results, hinted.results)
    lines.push(
      `keyterms ablation, n=${ablation.n} LASA utterances: partner heard ${ablation.partnerPlain} without hints, ${ablation.partnerHinted} with LASA names in keyterms_prompt`,
    )
  }
  return lines.join("\n")
}

function main(): void {
  console.log(
    liveReport(
      readJson<LiveManifest>(LIVE_MANIFEST_PATH),
      readJson<LiveResultFile>(LIVE_PLAIN_RESULT),
      readJson<LiveResultFile>(LIVE_HINTED_RESULT),
    ),
  )
}

if (process.argv[1]?.includes("live-report")) {
  main()
}
