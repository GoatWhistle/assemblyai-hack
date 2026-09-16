import { makeProvenance, type Provenance, type WordSpan } from "@/domain"

export type TurnRecord = {
  readonly turnOrder: number
  readonly transcript: string
  readonly isFormatted: boolean
  readonly words: readonly WordSpan[]
}

export const SEARCH_TURN_WINDOW = 3

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function tokensOf(text: string): readonly string[] {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t) => t.length > 0)
}

function findSpan(turn: TurnRecord, hint: readonly string[]): readonly WordSpan[] | null {
  const words = turn.words
  const normalized = words.map((w) => normalizeToken(w.text))
  for (let start = 0; start + hint.length <= normalized.length; start += 1) {
    let matches = true
    for (let i = 0; i < hint.length; i += 1) {
      if (normalized[start + i] !== hint[i]) {
        matches = false
        break
      }
    }
    if (matches) {
      return words.slice(start, start + hint.length)
    }
  }
  return null
}

export type ProvenanceMatch = {
  readonly provenance: Provenance
  readonly turnOrder: number
}

export function matchProvenance(input: {
  hint: string
  turns: readonly TurnRecord[]
  sessionId: string
  window?: number
}): ProvenanceMatch | null {
  const hint = tokensOf(input.hint)
  if (hint.length === 0) {
    return null
  }

  const window = input.window ?? SEARCH_TURN_WINDOW
  const recent = [...input.turns].sort((a, b) => b.turnOrder - a.turnOrder).slice(0, window)

  for (const turn of recent) {
    const span = findSpan(turn, hint)
    if (span !== null && span.length > 0) {
      return {
        provenance: makeProvenance({
          words: span,
          turnOrder: turn.turnOrder,
          transcriptSlice: span.map((w) => w.text).join(" "),
          sessionId: input.sessionId,
          sttTurnIsFormatted: turn.isFormatted,
        }),
        turnOrder: turn.turnOrder,
      }
    }
  }

  return null
}

export function searchedTurns(
  turns: readonly TurnRecord[],
  window = SEARCH_TURN_WINDOW,
): readonly number[] {
  return [...turns]
    .sort((a, b) => b.turnOrder - a.turnOrder)
    .slice(0, window)
    .map((t) => t.turnOrder)
    .sort((a, b) => a - b)
}
