"use client"

import { useState } from "react"
import type { FieldCandidate } from "@/domain"
import { Timecode } from "@/shared/ui/data-display/timecode"
import { Button } from "@/shared/ui/primitives/button"
import styles from "./styles.module.css"

export type ListenResult = "recorded" | "synthesised" | "unavailable"

export type ListenRequest = {
  readonly startMs: number
  readonly endMs: number
  readonly text: string
}

export type ListenHandler = (request: ListenRequest) => Promise<ListenResult>

export const LISTEN_NOTE: Readonly<Record<ListenResult, string>> = Object.freeze({
  recorded: "Played from the caller's own audio.",
  synthesised:
    "No recording of this segment exists here, so a synthesised voice read the words instead.",
  unavailable: "No recording of this segment exists and this browser cannot synthesise speech.",
})

export type SaidRecordedProps = {
  readonly candidate: FieldCandidate
  readonly onListen?: ListenHandler
}

export function SaidRecorded({ candidate, onListen }: SaidRecordedProps) {
  const [result, setResult] = useState<ListenResult | null>(null)
  const said = candidate.provenance.words.map((word) => word.text).join(" ")
  const recorded =
    candidate.normalizedValue === null ? "no standard form" : String(candidate.normalizedValue)
  return (
    <div className={styles.columns}>
      <div className={styles.column}>
        <p className={styles.label}>Recognizer heard</p>
        <p className={styles.said}>&ldquo;{said}&rdquo;</p>
        <p className={styles.when}>
          <Timecode startMs={candidate.provenance.startMs} endMs={candidate.provenance.endMs} />
        </p>
        {onListen === undefined ? null : (
          <Button
            onClick={() => {
              void onListen({
                startMs: candidate.provenance.startMs,
                endMs: candidate.provenance.endMs,
                text: said,
              }).then(setResult)
            }}
          >
            Listen
          </Button>
        )}
        {result === null ? null : (
          <output className={styles.note}>{LISTEN_NOTE[result]}</output>
        )}
      </div>
      <div className={styles.column}>
        <p className={styles.label}>Recorded as</p>
        <p className={styles.recorded}>{recorded}</p>
      </div>
    </div>
  )
}
