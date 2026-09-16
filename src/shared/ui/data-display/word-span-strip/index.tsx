"use client"

import type { Provenance, WordSpan } from "@/domain"
import styles from "./styles.module.css"

export type WordSpanStripProps = {
  readonly provenance: Provenance
  readonly weakBelow?: number
  readonly selectedStartMs?: number | null
  readonly onSelectWord?: (word: WordSpan) => void
}

export function WordSpanStrip({
  provenance,
  weakBelow = 0.9,
  selectedStartMs = null,
  onSelectWord,
}: WordSpanStripProps) {
  return (
    <div className={styles.strip}>
      <div className={styles.words}>
        {provenance.words.map((word) => {
          const selected = selectedStartMs === word.startMs
          const classes = [styles.word, word.confidence < weakBelow ? styles.weak : ""]
            .filter((value) => value !== undefined && value !== "")
            .join(" ")
          return (
            <button
              key={`${word.startMs}-${word.text}`}
              type="button"
              className={classes}
              aria-pressed={selected}
              onClick={() => onSelectWord?.(word)}
              title={`${word.text}: ${word.startMs}-${word.endMs} ms, recognizer certainty ${word.confidence.toFixed(2)}`}
            >
              <span className={styles.text}>{word.text}</span>
              <span className={styles.timecode}>
                {word.startMs}-{word.endMs} ms &middot; {word.confidence.toFixed(2)}
              </span>
            </button>
          )
        })}
      </div>
      <p className={styles.summary}>
        <span>
          span {provenance.startMs}-{provenance.endMs} ms
        </span>
        <span>turn {provenance.turnOrder}</span>
        <span>{provenance.words.length} words</span>
        <span>mean {provenance.meanConfidence.toFixed(2)}</span>
      </p>
      <p className={styles.slice}>
        Transcript as shown to the operator: &ldquo;{provenance.transcriptSlice}&rdquo;
        {provenance.sttTurnIsFormatted ? " (formatted turn)" : " (unformatted turn)"}
      </p>
    </div>
  )
}
