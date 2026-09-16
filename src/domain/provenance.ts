import { EmptyProvenanceError } from "./errors"
import type { WordSpan } from "./word-span"

export type Provenance = {
  readonly words: readonly WordSpan[]
  readonly turnOrder: number
  readonly transcriptSlice: string
  readonly sessionId: string
  readonly sttTurnIsFormatted: boolean
  readonly minConfidence: number
  readonly meanConfidence: number
  readonly startMs: number
  readonly endMs: number
  readonly spokenText: string
}

export function makeProvenance(input: {
  words: readonly WordSpan[]
  turnOrder: number
  transcriptSlice: string
  sessionId: string
  sttTurnIsFormatted?: boolean
}): Provenance {
  const words = input.words
  if (words.length === 0) {
    throw new EmptyProvenanceError()
  }
  if (!Number.isInteger(input.turnOrder) || input.turnOrder < 0) {
    throw new EmptyProvenanceError(
      `turnOrder must be a non-negative integer, got ${input.turnOrder}`,
    )
  }
  const confidences = words.map((w) => w.confidence)
  return Object.freeze({
    words: Object.freeze([...words]),
    turnOrder: input.turnOrder,
    transcriptSlice: input.transcriptSlice,
    sessionId: input.sessionId,
    sttTurnIsFormatted: input.sttTurnIsFormatted ?? false,
    minConfidence: Math.min(...confidences),
    meanConfidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
    startMs: Math.min(...words.map((w) => w.startMs)),
    endMs: Math.max(...words.map((w) => w.endMs)),
    spokenText: words.map((w) => w.text).join(" "),
  })
}
