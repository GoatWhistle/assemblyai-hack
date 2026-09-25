import type { BenchmarkRow } from "@/domain"

export const BENCHMARK_ROWS: readonly BenchmarkRow[] = Object.freeze([
  {
    figure: "entity error rate of the recognizer, 95% Wilson",
    value: "27.5%",
    input: "tts",
    command: "npx tsx scripts/eer/report.ts eval/control",
    n: 40,
    measuredOn: "2026-09-16",
  },
  {
    figure: "recognizer errors stopped before any plain read-back, shipped policy",
    value: "100.0% [84.5%, 100.0%]",
    input: "tts",
    command: "npx tsx scripts/measure/coverage-matrix.ts",
    n: 21,
    measuredOn: "2026-09-16",
  },
  {
    figure: "correct drug names the shipped gate asks about, the standing read-back included",
    value: "59/59",
    input: "tts",
    command: "npx tsx scripts/measure/coverage-matrix.ts",
    n: 59,
    measuredOn: "2026-09-16",
  },
  {
    figure: "correct drug names given a contrastive question under the full ISMP list",
    value: "35.6% [24.6%, 48.3%]",
    input: "tts",
    command: "npx tsx scripts/measure/coverage-matrix.ts",
    n: 59,
    measuredOn: "2026-09-25",
  },
  {
    figure: "pair mishearings a reflex yes would write, shipped policy",
    value: "0/20",
    input: "text",
    command: "npx tsx scripts/measure/ab-gate.ts",
    n: 20,
    measuredOn: "2026-09-25",
  },
  {
    figure: "pair mishearings a reflex yes would write, same policy without the pair rule",
    value: "20/20",
    input: "text",
    command: "npx tsx scripts/measure/ab-gate.ts",
    n: 20,
    measuredOn: "2026-09-25",
  },
  {
    figure: "distinct pairs in the full 2023 ISMP list, the product rule",
    value: "514",
    input: "text",
    command: "npx tsx scripts/measure/ismp-coverage.ts",
    n: 514,
    measuredOn: "2026-09-25",
  },
  {
    figure: "catalogue drugs carrying a name on the ISMP list",
    value: "502 of 3730 (13.5%)",
    input: "text",
    command: "npx tsx scripts/measure/ismp-coverage.ts",
    n: 3730,
    measuredOn: "2026-09-25",
  },
  {
    figure: "NPI single-digit substitutions caught by the checksum",
    value: "100.0%",
    input: "text",
    command: "npx tsx scripts/measure/audit-checksums.ts 200",
    n: 18000,
    measuredOn: "2026-09-25",
  },
  {
    figure: "NPI adjacent transpositions caught by the checksum",
    value: "97.9%",
    input: "text",
    command: "npx tsx scripts/measure/audit-checksums.ts 200",
    n: 840,
    measuredOn: "2026-09-25",
  },
  {
    figure: "DEA single-digit substitutions caught by the checksum",
    value: "95.2%",
    input: "text",
    command: "npx tsx scripts/measure/audit-checksums.ts 200",
    n: 12600,
    measuredOn: "2026-09-25",
  },
  {
    figure: "observed accuracy at reported confidence 0.95 to 0.99",
    value: "89.7% [76.4%, 95.9%]",
    input: "tts",
    command: "npx tsx scripts/measure/analyse-calibration.ts",
    n: 39,
    measuredOn: "2026-09-16",
  },
  {
    figure: "error rate on drugs with at most one catalogue combination",
    value: "43.8%",
    input: "tts",
    command: "npx tsx scripts/measure/analyse-rarity.ts",
    n: 16,
    measuredOn: "2026-09-16",
  },
  {
    figure: "entity error rate on human voices",
    value: null,
    input: "live socket",
    command: "make eval-live",
    n: null,
    measuredOn: null,
  },
  {
    figure: "false confirmations on non-commands, human voices",
    value: null,
    input: "live socket",
    command: "make eval-live",
    n: null,
    measuredOn: null,
  },
  {
    figure: "recognizer drift toward a hinted LASA name (keyterms ablation)",
    value: null,
    input: "live socket",
    command: "npx tsx scripts/measure/keyterms-ablation.ts",
    n: null,
    measuredOn: null,
  },
  {
    figure: "end of speech to gate decision, browser",
    value: null,
    input: "live socket",
    command: "not measured",
    n: null,
    measuredOn: null,
  },
])

export const BENCHMARK_AGREEMENT_NOTE =
  "published totals match raw runs: tests/stats/benchmark-agreement.test.ts fails when a figure here is absent from eval/REPORT.md or its command is not a step that make honest re-runs"

export type BusinessReading = {
  readonly reading: string
  readonly value: string | null
  readonly derivedFrom: string
  readonly caveat: string
}

export const BUSINESS_READING: readonly BusinessReading[] = Object.freeze([
  {
    reading:
      "pair mishearings a caller's reflex yes would write, without the pair rule against with it",
    value: "20 of 20 against 0 of 20",
    derivedFrom: "npx tsx scripts/measure/ab-gate.ts",
    caveat:
      "a seeded text corpus of 40 candidates, half misheard inside a curated pair; both arms read every drug name back, and how often a real caller answers a plain read-back by reflex is not measured",
  },
  {
    reading: "pharmacist seconds spent on re-asks per order",
    value: null,
    derivedFrom: "browser latency over live sessions (E7)",
    caveat: "not measured: no live session has been recorded yet",
  },
  {
    reading: "catches per 1000 orders",
    value: null,
    derivedFrom: "human-voice evaluation (E1)",
    caveat:
      "not measured: the only error rates we hold come from synthetic speech, and multiplying them up to a per-order rate would present a TTS figure as a clinical one",
  },
  {
    reading: "cost of one adverse drug event avoided",
    value: null,
    derivedFrom: "a published source the coordinator names (V1)",
    caveat: "no figure until a source with a year is attached",
  },
])
