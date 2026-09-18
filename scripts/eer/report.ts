import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { LATENCY_BUDGET_MS, ratePerHourFor } from "@/domain"
import { formatInterval, wilson } from "../../src/stats/wilson"
import type { Scored } from "./score"
import { confidenceOnErrors } from "./score"
import type { TranscriptResult } from "./transcribe"

const PUBLISHED_FINALIZATION_BAR_MS = LATENCY_BUDGET_MS.finalization

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[index] ?? 0
}

function accuracyRows(scored: readonly Scored[]): readonly string[] {
  const errorConfidences = confidenceOnErrors(scored)
  const rows = [
    `| items | ${scored.length} |`,
    `| entity error rate, 95% Wilson | **${formatInterval(wilson(scored.filter((s) => !s.correct).length, scored.length))}** |`,
    `| entities heard correctly | ${scored.filter((s) => s.correct).length} |`,
    `| confidence P50 over all | ${percentile(
      scored.map((s) => s.minConfidence),
      50,
    ).toFixed(3)} |`,
    `| confidence min over all | ${Math.min(...scored.map((s) => s.minConfidence)).toFixed(3)} |`,
  ]
  if (errorConfidences.length > 0) {
    rows.push(
      `| confidence on wrong entities, min..max | ${Math.min(...errorConfidences).toFixed(3)}..${Math.max(...errorConfidences).toFixed(3)} |`,
    )
  }
  rows.push(`| close codes seen | ${[...new Set(scored.map((s) => s.closeCode))].join(", ")} |`)
  return rows
}

function latencyRows(results: readonly TranscriptResult[]): readonly string[] {
  const clean = results.filter((r) => r.closeCode === 1000)
  if (clean.length === 0) {
    return ["| latency | no socket closed cleanly, nothing to report |"]
  }
  const opens = clean.map((r) => r.openMs)
  const firsts = clean.map((r) => r.firstPartialMs).filter((v): v is number => v !== null)
  const finals = clean.map((r) => r.finalizationMs).filter((v): v is number => v !== null)
  const rows = [
    `| socket open P50 / P95 | ${percentile(opens, 50)} / ${percentile(opens, 95)} ms |`,
  ]
  if (firsts.length > 0) {
    rows.push(
      `| first Turn after open, P50 / P95 | ${percentile(firsts, 50)} / ${percentile(firsts, 95)} ms |`,
    )
  }
  if (finals.length > 0) {
    const over = finals.filter((v) => v > PUBLISHED_FINALIZATION_BAR_MS).length
    rows.push(
      `| finalization delay P50 / P95 / max | ${percentile(finals, 50)} / ${percentile(finals, 95)} / ${Math.max(...finals)} ms |`,
      `| over the published ${PUBLISHED_FINALIZATION_BAR_MS} ms P95 bar | ${over} of ${finals.length} |`,
    )
  }
  rows.push(
    `| Turn messages per item, P50 | ${percentile(
      clean.map((r) => r.turnCount),
      50,
    )} |`,
  )
  return rows
}

function costRows(results: readonly TranscriptResult[]): readonly string[] {
  const audioSeconds = results.reduce((sum, r) => sum + r.audioSeconds, 0)
  const socketSeconds = results.reduce((sum, r) => sum + r.socketMs / 1000, 0)
  return [
    `| audio sent | ${audioSeconds.toFixed(1)} s |`,
    `| socket time billed | ${socketSeconds.toFixed(1)} s = $${((socketSeconds / 3600) * ratePerHourFor(["stt"])).toFixed(4)} |`,
  ]
}

export function printReport(
  scored: readonly Scored[],
  results: readonly TranscriptResult[],
): void {
  console.log("")
  console.log("| Figure | Value |")
  console.log("|---|---|")
  for (const row of [...accuracyRows(scored), ...latencyRows(results), ...costRows(results)]) {
    console.log(row)
  }

  const wrong = scored.filter((s) => !s.correct)
  if (wrong.length === 0) {
    return
  }
  console.log("")
  console.log("misheard entities:")
  for (const entry of wrong) {
    console.log(
      `  ${entry.spoken} -> ${entry.heard || "(nothing)"} at confidence ${entry.minConfidence.toFixed(3)} (${entry.voice})`,
    )
  }
}

function main(): void {
  const setPath = process.argv[2]
  if (setPath === undefined) {
    console.error("usage: eer-report.ts <set path>")
    process.exit(1)
  }
  const file = join(setPath, "result-plain.json")
  if (!existsSync(file)) {
    console.error(
      `no recorded run at ${file}; this reports on a recorded run and never calls the API`,
    )
    process.exit(1)
  }
  const parsed = JSON.parse(readFileSync(file, "utf8")) as {
    readonly scored: readonly Scored[]
    readonly results?: readonly TranscriptResult[]
  }
  console.log(`recorded run at ${file}: ${parsed.scored.length} utterances`)
  printReport(parsed.scored, parsed.results ?? [])
}

if (process.argv[1]?.replaceAll("\\", "/").includes("eer/report")) {
  main()
}
