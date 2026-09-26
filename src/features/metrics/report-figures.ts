import type { BenchmarkRow } from "@/domain"
import { FieldName, policyFor } from "@/domain"
import { BENCHMARK_ROWS } from "@/stats"
import type { BenchmarkEntry } from "./benchmark-row"

export const COVERAGE_MATRIX_SCRIPT = "npx tsx scripts/measure/coverage-matrix.ts"
export const AB_GATE_SCRIPT = "npx tsx scripts/measure/ab-gate.ts"
export const HELD_OUT_EER_SCRIPT = "npx tsx scripts/eer/report.ts eval/heldout"
export const HELD_OUT_STRATA_SCRIPT =
  "npx tsx scripts/measure/analyse-rarity.ts --set eval/heldout --strata 3"
export const HELD_OUT_RUN = "make eval-heldout"
export const HELD_OUT_MEASURED_ON = "2026-09-16"
export const HELD_OUT_SIZE = 60
export const HELD_OUT_STRATUM_SIZE = 20

export const THRESHOLDS = Object.freeze({
  drugName: policyFor(FieldName.DrugName).autoAcceptThreshold,
  strength: policyFor(FieldName.Strength).autoAcceptThreshold,
})

export const READ_BACK_COST = Object.freeze({
  plainWords: "6.0 words",
  plainSeconds: "2.5 s",
  contrastiveWords: "28.7 words",
  contrastiveSeconds: "11.8 s",
  extraSeconds: "9.4 s",
  wordsPerSecond: "2.43 words",
  rateSet: "eval/control",
  command: COVERAGE_MATRIX_SCRIPT,
})

export const HELD_OUT_GENUINE_ABOVE_THRESHOLD = Object.freeze([
  "oteseconazole",
  "chlorthalidone",
])

export type AbCatch = {
  readonly without: BenchmarkRow
  readonly with: BenchmarkRow
}

function abRow(matches: (figure: string) => boolean): BenchmarkRow | null {
  return (
    BENCHMARK_ROWS.find((row) => row.command === AB_GATE_SCRIPT && matches(row.figure)) ?? null
  )
}

export function abCatch(): AbCatch | null {
  const without = abRow((figure) => figure.includes("without the pair rule"))
  const shipped = abRow((figure) => figure.includes("shipped policy"))
  if (without === null || shipped === null) {
    return null
  }
  return { without, with: shipped }
}

export function contrastiveShareRow(): BenchmarkRow | null {
  return (
    BENCHMARK_ROWS.find(
      (row) =>
        row.command === COVERAGE_MATRIX_SCRIPT && row.figure.includes("contrastive question"),
    ) ?? null
  )
}

function heldOutEntry(
  id: string,
  figure: string,
  value: string,
  command: string,
  n: number,
  meaning: string,
): BenchmarkEntry {
  return {
    id: `heldout-${id}`,
    row: { figure, value, input: "tts", command, n, measuredOn: HELD_OUT_MEASURED_ON },
    meaning,
    setDescription: `eval/heldout, recorded by ${HELD_OUT_RUN}`,
    tone: "neutral",
  }
}

export const HELD_OUT_ENTRIES: readonly BenchmarkEntry[] = Object.freeze([
  heldOutEntry(
    "eer",
    "Entity error rate on the held-out set",
    "26.7% [17.1%, 39.0%]",
    HELD_OUT_EER_SCRIPT,
    HELD_OUT_SIZE,
    "Sixty names never measured before, drawn and sealed on 16 September and opened once. It sits beside 27.5% on the control corpus, so the recognizer's difficulty with rare names generalises to names it had never been measured on.",
  ),
  heldOutEntry(
    "rare",
    "Rare stratum: at most one catalogue combination",
    "30.0% [14.5%, 51.9%]",
    HELD_OUT_STRATA_SCRIPT,
    HELD_OUT_STRATUM_SIZE,
    "The pre-registered hypothesis predicted this stratum would fail most, with an interval clear of the common one.",
  ),
  heldOutEntry(
    "mid",
    "Middle stratum: two to four combinations",
    "30.0% [14.5%, 51.9%]",
    HELD_OUT_STRATA_SCRIPT,
    HELD_OUT_STRATUM_SIZE,
    "Identical to the rare stratum, where the hypothesis predicted a decline.",
  ),
  heldOutEntry(
    "common",
    "Common stratum: five or more combinations",
    "20.0% [8.1%, 41.6%]",
    HELD_OUT_STRATA_SCRIPT,
    HELD_OUT_STRATUM_SIZE,
    "The interval overlaps the rare one heavily, so the effect is not demonstrated and the hypothesis is published as not supported.",
  ),
])
