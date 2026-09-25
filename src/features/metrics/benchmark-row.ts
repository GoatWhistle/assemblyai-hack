import type { BenchmarkRow } from "@/domain"
import { confidenceFigures, errorRateFigures } from "./measured-figures"
import {
  type BenchmarkInput,
  GATE_METRICS,
  LATENCY_METRICS,
  type MetricDefinition,
  ORDER_METRICS,
} from "./metric-definitions"

export type { BenchmarkRow } from "@/domain"

export type BenchmarkEntry = {
  readonly id: string
  readonly row: BenchmarkRow
  readonly meaning: string
  readonly setDescription: string
  readonly tone: "neutral" | "alert"
}

export const INPUT_LABEL: Readonly<Record<BenchmarkInput, string>> = Object.freeze({
  "live socket": "live socket",
  tts: "TTS",
  text: "text",
  fixture: "fixture",
})

export const NOT_MEASURED_LABEL = "not measured"

export const RAW_RUN_AGREEMENT_TEST = "tests/features/metrics/raw-run-agreement.test.ts"

function toBenchmarkEntry(definition: MetricDefinition): BenchmarkEntry {
  return {
    id: definition.id,
    row: {
      figure: definition.name,
      value: definition.value,
      input: definition.input,
      command: definition.command,
      n: definition.value === null ? null : definition.n,
      measuredOn: definition.value === null ? null : definition.measuredOn,
    },
    meaning: definition.meaning,
    setDescription: definition.setDescription,
    tone: definition.tone ?? "neutral",
  }
}

function benchmarkDefinitions(): readonly MetricDefinition[] {
  return [
    ...errorRateFigures(),
    ...confidenceFigures(),
    ...GATE_METRICS,
    ...ORDER_METRICS,
    ...LATENCY_METRICS,
  ]
}

export function benchmarkEntries(): readonly BenchmarkEntry[] {
  return benchmarkDefinitions().map(toBenchmarkEntry)
}
