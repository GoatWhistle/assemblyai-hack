"use client"

import { useEffect, useRef } from "react"
import type { WordSpan } from "@/domain"
import { EmptyState } from "@/shared/ui/states/empty-state"
import styles from "./styles.module.css"
import type { SpanSelection, TranscriptEntry } from "./transcript-entry"
import { TranscriptLine } from "./transcript-line"

const FOLLOW_SLACK_PX = 72

export type TranscriptViewProps = {
  readonly entries: readonly TranscriptEntry[]
  readonly selection: SpanSelection
  readonly weakBelow?: number
  readonly onSelectWord?: (word: WordSpan, entry: TranscriptEntry) => void
}

export function TranscriptView({
  entries,
  selection,
  weakBelow = 0.9,
  onSelectWord,
}: TranscriptViewProps) {
  const viewRef = useRef<HTMLDivElement | null>(null)
  const followingRef = useRef(true)
  const rememberPosition = () => {
    const view = viewRef.current
    if (view === null) {
      return
    }
    const distanceToEnd = view.scrollHeight - view.scrollTop - view.clientHeight
    followingRef.current = distanceToEnd <= FOLLOW_SLACK_PX
  }
  const turnCount = entries.length
  useEffect(() => {
    const view = viewRef.current
    if (view === null || !followingRef.current || turnCount === 0) {
      return
    }
    view.scrollTop = view.scrollHeight
  }, [turnCount])
  if (entries.length === 0) {
    return (
      <EmptyState
        glyph="~"
        title="Nothing has been said yet"
        body="Turns appear here as the recognizer finalises them. Selecting a field highlights the exact words that produced its value, and selecting a word finds the field it fed."
      />
    )
  }
  return (
    <div className={styles.view} ref={viewRef} onScroll={rememberPosition}>
      {entries.map((entry) => (
        <TranscriptLine
          key={entry.id}
          entry={entry}
          selection={selection}
          weakBelow={weakBelow}
          onSelectWord={onSelectWord}
        />
      ))}
    </div>
  )
}
