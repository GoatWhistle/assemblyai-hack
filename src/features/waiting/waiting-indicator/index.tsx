"use client"

import { useReducedMotion } from "@/shared/ui/motion/use-reduced-motion"
import { WAITING_COPY, type WaitingOn, type WaitingSignals, waitingOn } from "../waiting-state"
import styles from "./styles.module.css"

export type WaitingIndicatorProps = {
  readonly signals: WaitingSignals
}

const SIDE_CLASS: Readonly<Record<"human" | "system" | "neither", string>> = Object.freeze({
  human: styles.human ?? "",
  system: styles.system ?? "",
  neither: styles.neither ?? "",
})

const SIDE_LABEL: Readonly<Record<"human" | "system" | "neither", string>> = Object.freeze({
  human: "your turn",
  system: "the system's turn",
  neither: "no turn",
})

export function WaitingIndicator({ signals }: WaitingIndicatorProps) {
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
      <span className={styles.badge}>{SIDE_LABEL[copy.side]}</span>
      <span className={styles.text}>
        <span className={styles.headline}>{copy.headline}</span>
        <span className={styles.detail}>{copy.detail}</span>
        <span className={styles.observed}>Read from {copy.observedFrom}</span>
      </span>
    </output>
  )
}
