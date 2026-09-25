import { FieldName, policyFor } from "@/domain"
import { lasaRiskFor } from "@/lasa"
import { wilson } from "@/stats"
import type { MetricDefinition } from "./metric-definitions"
import {
  coverageMatrixRuns,
  coverageMatrixScored,
  latestMeasuredOn,
  recordedRuns,
  type Scored,
} from "./recorded-runs"

const DRUG_NAME_THRESHOLD = policyFor(FieldName.DrugName).autoAcceptThreshold
const COVERAGE_MATRIX_COMMAND = "make coverage-matrix"
const COVERAGE_MATRIX_SET = "the control and native 16 kHz runs"

export type FalseAskTally = {
  readonly asked: number
  readonly of: number
  readonly byPairRule: number
  readonly byThreshold: number
  readonly byStandingReadBack: number
  readonly thresholdWithoutPairRule: number
  readonly threshold: number
  readonly command: string
  readonly measuredOn: string | null
}

function outOf(part: number, total: number): string | null {
  if (total === 0) {
    return null
  }
  return `${part} of ${total}`
}

function ratePercent(successes: number, total: number): string | null {
  if (total === 0) {
    return null
  }
  const interval = wilson(successes, total)
  return `${(interval.point * 100).toFixed(1)}% [${(interval.low * 100).toFixed(1)}, ${(interval.high * 100).toFixed(1)}]`
}

function errors(scored: readonly Scored[]): readonly Scored[] {
  return scored.filter((entry) => entry.correct === false)
}

function correctBelowThreshold(scored: readonly Scored[]): readonly Scored[] {
  return scored.filter((entry) => entry.correct && entry.minConfidence < DRUG_NAME_THRESHOLD)
}

export function errorRateFigures(): readonly MetricDefinition[] {
  return recordedRuns().map((run) => ({
    id: `eer-${run.id}`,
    name: `Entity error rate, ${run.name.toLowerCase()}`,
    meaning: `How often the recognizer returned a different drug name than the one spoken. ${run.setDescription}.`,
    command: run.command,
    setDescription: `${run.scored.length} utterances, recorded ${run.measuredAt.slice(0, 10)}`,
    value: ratePercent(errors(run.scored).length, run.scored.length),
    input: "tts",
    n: run.scored.length,
    measuredOn: run.measuredAt.slice(0, 10),
    tone: run.entityErrorRate > 0.2 ? "alert" : "neutral",
  }))
}

export function confidenceFigures(): readonly MetricDefinition[] {
  const scored = coverageMatrixScored()
  const measuredOn = latestMeasuredOn(coverageMatrixRuns())
  const wrong = errors(scored)
  const correct = scored.filter((entry) => entry.correct)
  const aboveThreshold = wrong.filter((entry) => entry.minConfidence >= DRUG_NAME_THRESHOLD)

  return [
    {
      id: "errors-above-threshold",
      name: "Errors the recognizer was confident about",
      meaning:
        "Recognizer errors whose own reported confidence sat at or above the drug-name threshold. A confidence check alone would have written every one of these into an order, which is the reason this product does not rely on one.",
      command: COVERAGE_MATRIX_COMMAND,
      setDescription: `${wrong.length} recorded errors across ${COVERAGE_MATRIX_SET}`,
      value: outOf(aboveThreshold.length, wrong.length),
      input: "tts",
      n: wrong.length === 0 ? null : wrong.length,
      measuredOn,
      tone: "alert",
    },
    {
      id: "threshold-false-asks",
      name: "Correct values the threshold would re-ask",
      meaning:
        "Values the recognizer got right but reported below the threshold, counted with the pair rule switched off. The shipped policy reads every drug name back once regardless, so the threshold changes which question is asked, not whether one is; the catalogue check adds none of its own.",
      command: COVERAGE_MATRIX_COMMAND,
      setDescription: `${correct.length} correct values across ${COVERAGE_MATRIX_SET}`,
      value: outOf(correctBelowThreshold(scored).length, correct.length),
      input: "tts",
      n: correct.length === 0 ? null : correct.length,
      measuredOn,
    },
    {
      id: "catalogue-coverage",
      name: "Errors the catalogue refuses",
      meaning:
        "Recorded errors that no prescription product in the built catalogue matches, so the gate refuses them regardless of confidence. Measured by running the real validator and the real gate over each recorded utterance.",
      command: COVERAGE_MATRIX_COMMAND,
      setDescription: `${wrong.length} recorded errors, assigned in the gate's own branch order`,
      value: outOf(wrong.length, wrong.length),
      input: "tts",
      n: wrong.length === 0 ? null : wrong.length,
      measuredOn,
    },
  ]
}

export function falseAskTally(): FalseAskTally | null {
  const scored = coverageMatrixScored()
  const correct = scored.filter((entry) => entry.correct)
  if (correct.length === 0) {
    return null
  }
  const byPairRule = correct.filter((entry) => lasaRiskFor(entry.heard).hit)
  const unpaired = correct.filter((entry) => !lasaRiskFor(entry.heard).hit)
  const byThreshold = unpaired.filter((entry) => entry.minConfidence < DRUG_NAME_THRESHOLD)
  return {
    asked: correct.length,
    of: correct.length,
    byPairRule: byPairRule.length,
    byThreshold: byThreshold.length,
    byStandingReadBack: unpaired.length - byThreshold.length,
    thresholdWithoutPairRule: correctBelowThreshold(scored).length,
    threshold: DRUG_NAME_THRESHOLD,
    command: COVERAGE_MATRIX_COMMAND,
    measuredOn: latestMeasuredOn(coverageMatrixRuns()),
  }
}
