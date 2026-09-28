import { FieldName, policyFor } from "@/domain"
import { falseAskTally } from "@/features/metrics/measured-figures"
import { coverageMatrixScored, type Scored } from "@/features/metrics/recorded-runs"
import {
  AB_GATE_SCRIPT,
  COVERAGE_MATRIX_SCRIPT,
  READ_BACK_COST,
} from "@/features/metrics/report-figures"
import { BENCHMARK_ROWS } from "@/stats"

export const ABSENT = "—"

const ISMP_SCRIPT = "npx tsx scripts/measure/ismp-coverage.ts"
const CHECKSUM_SCRIPT = "npx tsx scripts/measure/audit-checksums.ts 200"

function row(command: string, includes: string): string {
  const found = BENCHMARK_ROWS.find(
    (entry) => entry.command === command && entry.figure.includes(includes),
  )
  return found?.value ?? ABSENT
}

export const DRUG_NAME_THRESHOLD = policyFor(FieldName.DrugName).autoAcceptThreshold

export const ISMP_FIGURES = Object.freeze({
  pairs: row(ISMP_SCRIPT, "distinct pairs"),
  catalogue: row(ISMP_SCRIPT, "catalogue drugs carrying"),
})

export const CHECKSUM_FIGURES = Object.freeze({
  npiSubstitutions: row(CHECKSUM_SCRIPT, "NPI single-digit"),
  npiTranspositions: row(CHECKSUM_SCRIPT, "NPI adjacent"),
  deaSubstitutions: row(CHECKSUM_SCRIPT, "DEA single-digit"),
})

export const AB_FIGURES = Object.freeze({
  without: row(AB_GATE_SCRIPT, "without the pair rule"),
  with: row(AB_GATE_SCRIPT, "shipped policy"),
})

export const COST_FIGURES = Object.freeze({
  tally: falseAskTally(),
  asked: row(COVERAGE_MATRIX_SCRIPT, "asks about"),
  plainSeconds: READ_BACK_COST.plainSeconds,
  contrastiveSeconds: READ_BACK_COST.contrastiveSeconds,
  extraSeconds: READ_BACK_COST.extraSeconds,
})

export type RecognizerFigures = {
  readonly scored: readonly Scored[]
  readonly errors: readonly Scored[]
  readonly aboveThreshold: readonly Scored[]
  readonly floor: number
}

export function recognizerFigures(): RecognizerFigures {
  const scored = coverageMatrixScored()
  const errors = scored.filter((entry) => !entry.correct)
  const aboveThreshold = errors
    .filter((entry) => entry.minConfidence >= DRUG_NAME_THRESHOLD)
    .sort((a, b) => b.minConfidence - a.minConfidence)
  const lowest = Math.min(...scored.map((entry) => entry.minConfidence), DRUG_NAME_THRESHOLD)
  return { scored, errors, aboveThreshold, floor: Math.floor(lowest * 20) / 20 }
}

export const UNMEASURED = Object.freeze(
  BENCHMARK_ROWS.filter((entry) => entry.value === null).map((entry) => entry.figure),
)
