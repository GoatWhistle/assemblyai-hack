"use client"

import type { WordSpan } from "@/domain"
import { EmptyState } from "@/shared/ui/states/empty-state"
import styles from "./styles.module.css"
import type { SpanSelection, TranscriptEntry } from "./transcript-entry"
import { TranscriptLine } from "./transcript-line"

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
    <div className={styles.view}>
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
