"use client"

import type { WordSpan } from "@/domain"
import { isWordSelected, type SpanSelection, type TranscriptEntry } from "../transcript-entry"
import styles from "./styles.module.css"

function classes(...values: (string | undefined | false)[]): string {
  return values.filter((value) => typeof value === "string" && value !== "").join(" ")
}

export type TranscriptLineProps = {
  readonly entry: TranscriptEntry
  readonly selection: SpanSelection
  readonly weakBelow: number
  readonly onSelectWord?: (word: WordSpan, entry: TranscriptEntry) => void
}

export function TranscriptLine({
  entry,
  selection,
  weakBelow,
  onSelectWord,
}: TranscriptLineProps) {
  const isAgent = entry.speaker === "agent"
  return (
    <article className={styles.turn}>
      <p className={styles.meta}>
        <span
          className={classes(
            styles.speaker,
            isAgent && styles.agentSpeaker,
            entry.discarded && styles.discardedSpeaker,
          )}
        >
          {isAgent ? "Agent" : "Caller"}
        </span>
        {entry.turnOrder === null ? null : <span>turn {entry.turnOrder}</span>}
        <span>{entry.receivedAtMs} ms</span>
      </p>
      <p
        className={classes(
          styles.line,
          isAgent && styles.agentLine,
          entry.discarded && styles.discardedLine,
        )}
      >
        {entry.words.length === 0
          ? entry.text
          : entry.words.map((word) => (
              <button
                key={`${entry.id}-${word.startMs}`}
                type="button"
                className={classes(
                  styles.word,
                  isWordSelected(word, selection) && styles.wordActive,
                  word.confidence < weakBelow && styles.wordWeak,
                )}
                title={`${word.startMs}-${word.endMs} ms, certainty ${word.confidence.toFixed(2)}`}
                onClick={() => onSelectWord?.(word, entry)}
              >
                {word.text}{" "}
              </button>
            ))}
      </p>
      {entry.discarded && entry.discardReason !== null ? (
        <p className={styles.discardNote}>{entry.discardReason}</p>
      ) : null}
    </article>
  )
}
