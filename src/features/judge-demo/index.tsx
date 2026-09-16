"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FieldCard } from "@/features/field-card"
import { GateBanner } from "@/features/gate-banner"
import { Button } from "@/shared/ui/primitives/button"
import { Chip } from "@/shared/ui/primitives/chip"
import {
  DEMO_ARMS,
  DEMO_DURATION_MS,
  DEMO_STAGES,
  RECOGNIZED_AS,
  RECOGNIZER_CERTAINTY,
  SPOKEN_TRUTH,
} from "./demo-arms"
import { LASA_CANDIDATE, LASA_DECISION } from "./scenario"
import styles from "./styles.module.css"

const TICK_MS = 100

export function JudgeDemo() {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => clear, [clear])

  const start = useCallback(() => {
    clear()
    setElapsedMs(0)
    setRunning(true)
    timer.current = setInterval(() => {
      setElapsedMs((previous) => {
        const next = previous + TICK_MS
        if (next >= DEMO_DURATION_MS) {
          clear()
          setRunning(false)
          return DEMO_DURATION_MS
        }
        return next
      })
    }, TICK_MS)
  }, [clear])

  const stop = useCallback(() => {
    clear()
    setRunning(false)
  }, [clear])

  const reached = elapsedMs >= 9600
  const fraction = Math.min(1, elapsedMs / DEMO_DURATION_MS)
  const stage =
    [...DEMO_STAGES].reverse().find((entry) => elapsedMs >= entry.atMs) ?? DEMO_STAGES[0]

  return (
    <div className={styles.demo}>
      <div className={styles.lede}>
        <h1 className={styles.title}>The forty-second demonstration</h1>
        <p className={styles.body}>
          One recorded session, replayed through the whole pipeline. No microphone is needed and
          no second person has to be on the line. The caller said {SPOKEN_TRUTH}; the recognizer
          returned {RECOGNIZED_AS} and was {RECOGNIZER_CERTAINTY.toFixed(2)} certain of it.
          Watch what each configuration does with that.
        </p>
      </div>

      <div className={styles.truth}>
        <p className={styles.truthLabel}>Ground truth for this recording</p>
        <p className={styles.truthText}>
          The human said {SPOKEN_TRUTH}. The recognizer heard {RECOGNIZED_AS} and reported{" "}
          {RECOGNIZER_CERTAINTY.toFixed(2)} certainty. Both drugs exist, both pass a catalogue
          lookup, and they treat different conditions.
        </p>
      </div>

      <div className={styles.controls}>
        <Button tone="primary" size="large" onClick={start} disabled={running}>
          {elapsedMs === 0 ? "Play the recorded session" : "Play again"}
        </Button>
        <Button onClick={stop} disabled={!running}>
          Stop
        </Button>
        <div className={styles.progress}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ transform: `scaleX(${fraction})` }} />
          </div>
          <p className={styles.progressLabel}>
            {(elapsedMs / 1000).toFixed(1)}s / {(DEMO_DURATION_MS / 1000).toFixed(1)}s
            {stage === undefined ? "" : ` · ${stage.label}`}
          </p>
        </div>
      </div>

      <div className={styles.split}>
        {DEMO_ARMS.map((arm) => {
          const armClass = [
            styles.arm,
            arm.id === "gated" ? styles.armGated : styles.armUngated,
          ].join(" ")
          const outcomeClass = [
            styles.outcome,
            arm.id === "gated" ? styles.outcomeGated : styles.outcomeUngated,
          ].join(" ")
          return (
            <section key={arm.id} className={armClass} aria-label={arm.title}>
              <header className={styles.armHead}>
                <h2 className={styles.armTitle}>
                  {arm.title}{" "}
                  <Chip tone={arm.id === "gated" ? "lasa" : "escalated"}>
                    {arm.id === "gated" ? "shipped" : "comparison only"}
                  </Chip>
                </h2>
                <p className={styles.armNote}>{arm.note}</p>
              </header>
              <div className={styles.said}>
                <p className={styles.saidWho}>
                  {reached ? "What the agent said at 9.6 seconds" : "What the agent will say"}
                </p>
                <p className={styles.saidText}>{arm.agentLine}</p>
              </div>
              <div className={outcomeClass}>
                <p className={styles.outcomeLabel}>{arm.outcomeLabel}</p>
                <p className={styles.outcomeValue}>
                  {reached ? arm.outcomeValue : arm.restingValue}
                </p>
                <p className={styles.outcomeBody}>
                  {reached ? arm.outcomeBody : arm.restingNote}
                </p>
              </div>
            </section>
          )
        })}
      </div>

      <GateBanner decision={reached ? LASA_DECISION : null} />
      <FieldCard candidate={LASA_CANDIDATE} decision={reached ? LASA_DECISION : null} />
    </div>
  )
}
