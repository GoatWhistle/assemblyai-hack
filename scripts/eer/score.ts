import { normalizeDrugName } from "../../src/lasa"
import type { TranscriptResult } from "./transcribe"

export type Scored = {
  readonly spoken: string
  readonly heard: string
  readonly correct: boolean
  readonly minConfidence: number
  readonly voice: string
  readonly closeCode: number
  readonly socketMs: number
}

const FILLERS = new Set(["the", "drug", "name", "is", "a", "an"])

function entityFrom(transcript: string): string {
  const cleaned = transcript
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0 && !FILLERS.has(token))
  return cleaned.join(" ").trim()
}

export function score(results: readonly TranscriptResult[]): readonly Scored[] {
  return results.map((result) => {
    const heard = entityFrom(result.transcript)
    const spoken = normalizeDrugName(result.item.spoken)
    const confidences = result.words.map((word) => word.confidence)
    return {
      spoken,
      heard,
      correct: normalizeDrugName(heard) === spoken,
      minConfidence: confidences.length === 0 ? 0 : Math.min(...confidences),
      voice: result.item.voice,
      closeCode: result.closeCode,
      socketMs: result.socketMs,
    }
  })
}

export function entityErrorRate(scored: readonly Scored[]): number {
  if (scored.length === 0) {
    return 0
  }
  return scored.filter((entry) => !entry.correct).length / scored.length
}

export function confidenceOnErrors(scored: readonly Scored[]): readonly number[] {
  return scored.filter((entry) => !entry.correct).map((entry) => entry.minConfidence)
}
