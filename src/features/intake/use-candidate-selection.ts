"use client"

import { useCallback, useMemo, useState } from "react"
import type { FieldCandidate, WordSpan } from "@/domain"
import type { ListenHandler } from "@/features/field-card/said-recorded"
import type { SpanSelection } from "@/features/transcript-view/transcript-entry"

export type CandidateSelection = {
  readonly selected: FieldCandidate | null
  readonly selection: SpanSelection
  selectCandidate: (candidate: FieldCandidate) => void
  selectWord: (word: WordSpan) => void
}

export function useCandidateSelection(
  candidates: readonly FieldCandidate[],
  onListen: ListenHandler | undefined,
): CandidateSelection {
  const [pinnedCandidateId, setPinnedCandidateId] = useState<string | null>(null)
  const [selection, setSelection] = useState<SpanSelection>(null)
  const selected = useMemo(() => {
    const pinned = candidates.find((entry) => entry.candidateId === pinnedCandidateId)
    return pinned ?? candidates[candidates.length - 1] ?? null
  }, [candidates, pinnedCandidateId])

  const selectCandidate = useCallback((candidate: FieldCandidate) => {
    setPinnedCandidateId(candidate.candidateId)
    setSelection({ startMs: candidate.provenance.startMs, endMs: candidate.provenance.endMs })
  }, [])

  const selectWord = useCallback(
    (word: WordSpan) => {
      setSelection({ startMs: word.startMs, endMs: word.endMs })
      void onListen?.({ startMs: word.startMs, endMs: word.endMs, text: word.text })
      const owner = candidates.find((candidate) =>
        candidate.provenance.words.some((entry) => entry.startMs === word.startMs),
      )
      if (owner !== undefined) {
        setPinnedCandidateId(owner.candidateId)
      }
    },
    [candidates, onListen],
  )

  return { selected, selection, selectCandidate, selectWord }
}
