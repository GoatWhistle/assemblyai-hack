import type { BenchmarkRow } from "@/domain"
import { LASA_PAIRS } from "@/lasa"
import { BENCHMARK_ROWS } from "@/stats"
import type { BenchmarkEntry } from "./benchmark-row"

type PolicySource = {
  readonly meaning: string
  readonly setDescription: string
}

const COVERAGE = "npx tsx scripts/measure/coverage-matrix.ts"
const AB_GATE = "npx tsx scripts/measure/ab-gate.ts"
const ISMP = "npx tsx scripts/measure/ismp-coverage.ts"

const SOURCES: ReadonlyMap<string, PolicySource> = new Map([
  [
    COVERAGE,
    {
      meaning:
        "Recorded confidences from synthesised speech through the live recognizer, replayed through the shipped gate: standing read-back, threshold and pair rule together.",
      setDescription: "the control and native 16 kHz runs",
    },
  ],
  [
    AB_GATE,
    {
      meaning:
        "Both arms read every drug name back and differ by the pair rule alone; a caller's reflex yes is assumed, because how often a real caller gives one is not measured.",
      setDescription: "seeded text candidates misheard inside a curated pair",
    },
  ],
  [
    ISMP,
    {
      meaning: `Counted from the full 2023 ISMP list, which the product applies, and the built catalogue. The ${LASA_PAIRS.length} curated pairs are the evaluation core, not the rule.`,
      setDescription: "the parsed list and the built catalogue",
    },
  ],
])

const REPORT_NOTES: ReadonlyMap<string, string> = new Map([
  [
    "npx tsx scripts/eer/report.ts eval/control",
    "The control-set run from the table above, as the report prints it: the same measurement, not a second one.",
  ],
  [
    "npx tsx scripts/measure/audit-checksums.ts 200",
    "Every single-digit substitution and every adjacent transposition of 200 valid identifiers of each kind, enumerated rather than sampled. The two checksums are not equally strong, and the rows say by how much.",
  ],
  [
    "npx tsx scripts/measure/analyse-calibration.ts",
    "Of the recorded utterances whose reported confidence fell in this band, the share whose drug name was right.",
  ],
  [
    "npx tsx scripts/measure/analyse-rarity.ts",
    "The control corpus split by catalogue combinations. The pre-registered held-out run did not replicate this gap; the Measurements page publishes that negative result.",
  ],
])

export const SHIPPED_POLICY_COMMANDS: readonly string[] = [COVERAGE, AB_GATE, ISMP]

function entryFor(row: BenchmarkRow, index: number): BenchmarkEntry | null {
  const source = SOURCES.get(row.command)
  if (source === undefined) {
    return null
  }
  return {
    id: `policy-${index}`,
    row,
    meaning: source.meaning,
    setDescription: source.setDescription,
    tone: "neutral",
  }
}

export function shippedPolicyEntries(
  rows: readonly BenchmarkRow[] = BENCHMARK_ROWS,
): readonly BenchmarkEntry[] {
  return rows.map(entryFor).filter((entry): entry is BenchmarkEntry => entry !== null)
}

export function reportEntries(
  rows: readonly BenchmarkRow[] = BENCHMARK_ROWS,
): readonly BenchmarkEntry[] {
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !SHIPPED_POLICY_COMMANDS.includes(row.command))
    .map(({ row, index }) => ({
      id: `report-${index}`,
      row,
      meaning: REPORT_NOTES.get(row.command) ?? "",
      setDescription: "",
      tone: "neutral" as const,
    }))
}
