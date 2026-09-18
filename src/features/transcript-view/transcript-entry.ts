import type { WordSpan } from "@/domain"

type TranscriptSpeaker = "caller" | "agent"

export type TranscriptEntry = {
  readonly id: string
  readonly speaker: TranscriptSpeaker
  readonly text: string
  readonly turnOrder: number | null
  readonly words: readonly WordSpan[]
  readonly receivedAtMs: number
  readonly discarded: boolean
  readonly discardReason: string | null
}

export function callerEntry(input: {
  id: string
  text: string
  turnOrder: number
  words: readonly WordSpan[]
  receivedAtMs: number
  discarded?: boolean
  discardReason?: string | null
}): TranscriptEntry {
  return {
    id: input.id,
    speaker: "caller",
    text: input.text,
    turnOrder: input.turnOrder,
    words: input.words,
    receivedAtMs: input.receivedAtMs,
    discarded: input.discarded ?? false,
    discardReason: input.discardReason ?? null,
  }
}

export function agentEntry(input: {
  id: string
  text: string
  receivedAtMs: number
}): TranscriptEntry {
  return {
    id: input.id,
    speaker: "agent",
    text: input.text,
    turnOrder: null,
    words: [],
    receivedAtMs: input.receivedAtMs,
    discarded: false,
    discardReason: null,
  }
}

export type SpanSelection = {
  readonly startMs: number
  readonly endMs: number
} | null

export function isWordSelected(word: WordSpan, selection: SpanSelection): boolean {
  if (selection === null) {
    return false
  }
  return word.startMs >= selection.startMs && word.endMs <= selection.endMs
}
