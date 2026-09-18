import { wilson } from "@/stats"
import type { MetricDefinition } from "./metric-definitions"
import { allScored, recordedRuns, type Scored } from "./recorded-runs"

const DRUG_NAME_THRESHOLD = 0.95

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

export function errorRateFigures(): readonly MetricDefinition[] {
  return recordedRuns().map((run) => ({
    id: `eer-${run.id}`,
    name: `Entity error rate, ${run.name.toLowerCase()}`,
    meaning: `How often the recognizer returned a different drug name than the one spoken. ${run.setDescription}.`,
    command: run.command,
    setDescription: `${run.scored.length} utterances, recorded ${run.measuredAt.slice(0, 10)}`,
    value: ratePercent(errors(run.scored).length, run.scored.length),
    tone: run.entityErrorRate > 0.2 ? "alert" : "neutral",
  }))
}

export function confidenceFigures(): readonly MetricDefinition[] {
  const scored = allScored()
  const wrong = errors(scored)
  const aboveThreshold = wrong.filter((entry) => entry.minConfidence >= DRUG_NAME_THRESHOLD)
  const correctBelow = scored.filter(
    (entry) => entry.correct && entry.minConfidence < DRUG_NAME_THRESHOLD,
  )

  return [
    {
      id: "errors-above-threshold",
      name: "Errors the recognizer was confident about",
      meaning:
        "Recognizer errors whose own reported confidence sat at or above the drug-name threshold. A confidence check alone would have written every one of these into an order, which is the reason this product does not rely on one.",
      command: "make coverage-matrix",
      setDescription: `${wrong.length} recorded errors across three runs`,
      value: outOf(aboveThreshold.length, wrong.length),
      tone: "alert",
    },
    {
      id: "threshold-false-asks",
      name: "Correct values the threshold would re-ask",
      meaning:
        "Values the recognizer got right but reported below the threshold. Every re-ask the system pays for is charged here, and the catalogue check adds none of its own.",
      command: "make coverage-matrix",
      setDescription: `${scored.filter((entry) => entry.correct).length} correct values across three runs`,
      value: outOf(correctBelow.length, scored.filter((entry) => entry.correct).length),
    },
    {
      id: "catalogue-coverage",
      name: "Errors the catalogue refuses",
      meaning:
        "Recorded errors that no prescription product in the built catalogue matches, so the gate refuses them regardless of confidence. Measured by running the real validator and the real gate over each recorded utterance.",
      command: "make coverage-matrix",
      setDescription: `${wrong.length} recorded errors, assigned in the gate's own branch order`,
      value: outOf(wrong.length, wrong.length),
    },
  ]
}
