"use client"

import { type CSSProperties, Fragment } from "react"
import type { WordSpan } from "@/domain"
import { isWordSelected, type SpanSelection, type TranscriptEntry } from "../transcript-entry"
import styles from "./styles.module.css"

function classes(...values: (string | undefined | false)[]): string {
  return values.filter((value) => typeof value === "string" && value !== "").join(" ")
}

const TRACE_CAP = 10

export function traceOrder(
  words: readonly WordSpan[],
  selection: SpanSelection,
): ReadonlyMap<number, number> {
  const order = new Map<number, number>()
  for (const word of words) {
    if (isWordSelected(word, selection)) {
      order.set(word.startMs, Math.min(order.size, TRACE_CAP))
    }
  }
  return order
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
  const traced = traceOrder(entry.words, selection)
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
              <Fragment key={`${entry.id}-${word.startMs}`}>
                <button
                  type="button"
                  className={classes(
                    styles.word,
                    traced.has(word.startMs) && styles.wordActive,
                    word.confidence < weakBelow && styles.wordWeak,
                  )}
                  style={
                    traced.has(word.startMs)
                      ? ({ "--i": traced.get(word.startMs) } as CSSProperties)
                      : undefined
                  }
                  title={`${word.startMs}-${word.endMs} ms, certainty ${word.confidence.toFixed(2)}`}
                  aria-label={`${word.text}, ${word.startMs} to ${word.endMs} ms, recognizer certainty ${word.confidence.toFixed(2)}`}
                  onClick={() => onSelectWord?.(word, entry)}
                >
                  {word.text}
                </button>{" "}
              </Fragment>
            ))}
      </p>
      {entry.discarded && entry.discardReason !== null ? (
        <p className={styles.discardNote}>{entry.discardReason}</p>
      ) : null}
    </article>
  )
}
