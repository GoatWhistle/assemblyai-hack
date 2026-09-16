import { InvalidWordSpanError } from "./errors"

export type WordSpan = {
  readonly text: string
  readonly startMs: number
  readonly endMs: number
  readonly confidence: number
  readonly speaker: string | null
  readonly wordIsFinal: boolean
}

export type TurnWord = {
  text: string
  start: number
  end: number
  confidence: number
  speaker?: string | null
  word_is_final?: boolean
}

export function makeWordSpan(input: {
  text: string
  startMs: number
  endMs: number
  confidence: number
  speaker?: string | null
  wordIsFinal?: boolean
}): WordSpan {
  const { text, startMs, endMs, confidence } = input
  if (!Number.isFinite(startMs) || startMs < 0) {
    throw new InvalidWordSpanError(`startMs must be a non-negative number, got ${startMs}`)
  }
  if (!Number.isFinite(endMs) || endMs < startMs) {
    throw new InvalidWordSpanError(`endMs ${endMs} is before startMs ${startMs}`)
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new InvalidWordSpanError(`confidence must be within [0, 1], got ${confidence}`)
  }
  return Object.freeze({
    text,
    startMs: Math.trunc(startMs),
    endMs: Math.trunc(endMs),
    confidence,
    speaker: input.speaker ?? null,
    wordIsFinal: input.wordIsFinal ?? true,
  })
}

export function wordSpanFromTurnWord(word: TurnWord): WordSpan {
  return makeWordSpan({
    text: word.text,
    startMs: word.start,
    endMs: word.end,
    confidence: word.confidence,
    speaker: word.speaker ?? null,
    wordIsFinal: word.word_is_final ?? true,
  })
}
