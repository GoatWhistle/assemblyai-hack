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
