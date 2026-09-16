import { makeProvenance, type Provenance, type WordSpan, wordSpanFromTurnWord } from "@/domain"
import type { SttTurn } from "./protocol"

export const DEFAULT_MATCH_WINDOW_MS = 12000

export type MatchedTurn = {
  readonly turn: SttTurn
  readonly words: readonly WordSpan[]
  readonly receivedAtMs: number
}

export function turnToWordSpans(turn: SttTurn): readonly WordSpan[] {
  return turn.words.map((word) => wordSpanFromTurnWord(word))
}

export function tokensOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0)
}

export function findSpanForValue(
  words: readonly WordSpan[],
  spokenValue: string,
): readonly WordSpan[] {
  const needle = tokensOf(spokenValue)
  if (needle.length === 0 || words.length === 0) {
    return []
  }
  const haystack = words.map((word) => tokensOf(word.text).join(" "))
  for (let start = 0; start <= words.length - 1; start += 1) {
    let cursor = start
    let matched = 0
    while (cursor < words.length && matched < needle.length) {
      const target = needle[matched]
      const candidate = haystack[cursor]
      if (target !== undefined && candidate !== undefined && candidate.includes(target)) {
        matched += 1
        cursor += 1
        continue
      }
      break
    }
    if (matched === needle.length) {
      return words.slice(start, cursor)
    }
  }
  const single = needle[0]
  if (single === undefined) {
    return []
  }
  const fallback = words.filter((word) => tokensOf(word.text).some((t) => t.includes(single)))
  return fallback
}

export class TurnMatcher {
  private turns: MatchedTurn[] = []

  constructor(private readonly windowMs: number = DEFAULT_MATCH_WINDOW_MS) {}

  get size(): number {
    return this.turns.length
  }

  record(turn: SttTurn, receivedAtMs: number): MatchedTurn {
    const entry: MatchedTurn = { turn, words: turnToWordSpans(turn), receivedAtMs }
    this.turns = [
      ...this.turns.filter((t) => t.turn.turn_order !== turn.turn_order),
      entry,
    ].sort((a, b) => a.turn.turn_order - b.turn.turn_order)
    return entry
  }

  latest(): MatchedTurn | null {
    return this.turns.length === 0 ? null : (this.turns[this.turns.length - 1] ?? null)
  }

  byOrder(turnOrder: number): MatchedTurn | null {
    return this.turns.find((entry) => entry.turn.turn_order === turnOrder) ?? null
  }

  candidatesNear(atMs: number): MatchedTurn[] {
    return this.turns
      .filter(
        (entry) => atMs - entry.receivedAtMs <= this.windowMs && entry.receivedAtMs <= atMs,
      )
      .reverse()
  }

  provenanceFor(
    spokenValue: string,
    sessionId: string,
    atMs: number,
  ): { provenance: Provenance; turn: SttTurn } | null {
    for (const entry of this.candidatesNear(atMs)) {
      const span = findSpanForValue(entry.words, spokenValue)
      if (span.length === 0) {
        continue
      }
      return {
        turn: entry.turn,
        provenance: makeProvenance({
          words: span,
          turnOrder: entry.turn.turn_order,
          transcriptSlice: entry.turn.transcript,
          sessionId,
          sttTurnIsFormatted: entry.turn.turn_is_formatted,
        }),
      }
    }
    return null
  }

  reset(): void {
    this.turns = []
  }
}
