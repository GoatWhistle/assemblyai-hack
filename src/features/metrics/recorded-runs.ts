import control from "../../../eval/control/result-plain.json"
import dev from "../../../eval/dev/result-plain.json"
import native16 from "../../../eval/native16/result-plain.json"

export type Scored = {
  readonly spoken: string
  readonly heard: string
  readonly correct: boolean
  readonly minConfidence: number
  readonly closeCode: number
}

export type RecordedRun = {
  readonly id: string
  readonly name: string
  readonly setDescription: string
  readonly command: string
  readonly scored: readonly Scored[]
  readonly entityErrorRate: number
  readonly measuredAt: string
}

const FILES: readonly RecordedRun[] = [
  {
    id: "dev",
    name: "Development set",
    setDescription:
      "40 drug names spoken by two synthetic voices, the set thresholds were tuned on",
    command: "make eval",
    scored: dev.scored as readonly Scored[],
    entityErrorRate: dev.entityErrorRate,
    measuredAt: dev.measuredAt,
  },
  {
    id: "control",
    name: "Control set, resampled",
    setDescription:
      "40 rarer names chosen before measuring, captured at 48 kHz and resampled to 16 kHz",
    command: "make eval-control",
    scored: control.scored as readonly Scored[],
    entityErrorRate: control.entityErrorRate,
    measuredAt: control.measuredAt,
  },
  {
    id: "native16",
    name: "Control set, native 16 kHz",
    setDescription: "the same 40 names synthesised at 16 kHz, with no resampling in the path",
    command: "make eval-native16",
    scored: native16.scored as readonly Scored[],
    entityErrorRate: native16.entityErrorRate,
    measuredAt: native16.measuredAt,
  },
]

export function recordedRuns(): readonly RecordedRun[] {
  return FILES
}

export function allScored(): readonly Scored[] {
  return FILES.flatMap((run) => run.scored)
}

const COVERAGE_MATRIX_RUNS: readonly string[] = ["control", "native16"]

export function coverageMatrixRuns(): readonly RecordedRun[] {
  return FILES.filter((run) => COVERAGE_MATRIX_RUNS.includes(run.id))
}

export function coverageMatrixScored(): readonly Scored[] {
  return coverageMatrixRuns().flatMap((run) => run.scored)
}

export function latestMeasuredOn(runs: readonly RecordedRun[]): string | null {
  const dates = runs.map((run) => run.measuredAt.slice(0, 10)).sort()
  return dates.at(-1) ?? null
}

export type CloseCodeCount = {
  readonly code: number
  readonly count: number
}

export function closeCodeCounts(): readonly CloseCodeCount[] {
  const tally = new Map<number, number>()
  for (const entry of allScored()) {
    tally.set(entry.closeCode, (tally.get(entry.closeCode) ?? 0) + 1)
  }
  return [...tally].map(([code, count]) => ({ code, count })).sort((a, b) => a.code - b.code)
}

export function sessionsRecorded(): number {
  return allScored().length
}
