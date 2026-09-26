"use client"

import { useReducedMotion } from "@/shared/ui/motion/use-reduced-motion"
import { WAITING_COPY, type WaitingOn, type WaitingSignals, waitingOn } from "../waiting-state"
import styles from "./styles.module.css"

export type WaitingIndicatorProps = {
  readonly signals: WaitingSignals
  readonly next?: string | null
}

const SIDE_CLASS: Readonly<Record<"human" | "system" | "neither", string>> = Object.freeze({
  human: styles.human ?? "",
  system: styles.system ?? "",
  neither: styles.neither ?? "",
})

const SIDE_LABEL: Readonly<Record<"human" | "system" | "neither", string>> = Object.freeze({
  human: "Your turn",
  system: "The system's turn",
  neither: "No turn",
})

export function WaitingIndicator({ signals, next = null }: WaitingIndicatorProps) {
  const state: WaitingOn = waitingOn(signals)
  const copy = WAITING_COPY[state]
  const reduced = useReducedMotion()
  const classes = [
    styles.indicator,
    SIDE_CLASS[copy.side],
    copy.side === "system" && !reduced ? styles.animated : "",
  ]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  return (
    <output className={classes} aria-live="polite" data-waiting-on={state}>
      <span className={styles.badge} title={`Read from ${copy.observedFrom}`}>
        {SIDE_LABEL[copy.side]}
      </span>
      <span className={styles.text}>
        <span className={styles.headline}>{copy.headline}</span>
        {next === null || copy.side !== "human" ? null : (
          <span className={styles.next}>Next: {next}</span>
        )}
        <span className={styles.detail}>{copy.detail}</span>
      </span>
    </output>
  )
}
