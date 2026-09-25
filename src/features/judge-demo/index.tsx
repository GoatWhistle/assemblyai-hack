"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
import { FieldCard } from "@/features/field-card"
import { GateBanner } from "@/features/gate-banner"
import { REDUCED_MOTION_QUERY } from "@/shared/ui/motion/use-reduced-motion"
import { Button } from "@/shared/ui/primitives/button"
import { DemoArmPanel } from "./demo-arm"
import {
  DECISION_AT_MS,
  DEMO_ARMS,
  DEMO_DURATION_MS,
  DEMO_STAGES,
  phaseAt,
  RECOGNIZED_AS,
  RECOGNIZER_CERTAINTY,
  SHIPPED_EVIDENCE,
  SPOKEN_TRUTH,
} from "./demo-arms"
import { KeytermsAb } from "./keyterms-ab"
import { ReplayNotice, ReplayTag } from "./replay-notice"
import { Captions } from "./replay-voice/captions"
import { highlightedField, REPLAY_LINES } from "./replay-voice/replay-script"
import {
  browserSpeaker,
  createSpeechTrack,
  type SpeechTrack,
} from "./replay-voice/speech-track"
import { LASA_CANDIDATE, LASA_DECISION } from "./scenario"
import { ScenarioPicker } from "./scenario-picker"
import styles from "./styles.module.css"
import { PLAY_CONTROL, STOP_CONTROL, useControlFocus } from "./use-control-focus"

const TICK_MS = 100

const StillScenarioPicker = memo(ScenarioPicker)
const StillKeytermsAb = memo(KeytermsAb)

export type JudgeDemoProps = {
  readonly autoplay?: boolean
  readonly headingLevel?: "h1" | "h2"
}

export function JudgeDemo({ autoplay = false, headingLevel = "h1" }: JudgeDemoProps) {
  const Heading = headingLevel
  const [elapsedMs, setElapsedMs] = useState(0)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoplayed = useRef(false)
  const speech = useRef<SpeechTrack | null>(null)
  const [voice, setVoice] = useState<"synthesised" | "silent" | "muted">("muted")
  const { controls, hold } = useControlFocus(running)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  const start = useCallback(() => {
    clear()
    setElapsedMs(0)
    setRunning(true)
    timer.current = setInterval(() => {
      setElapsedMs((previous) => {
        const next = previous + TICK_MS
        if (next >= DEMO_DURATION_MS) {
          hold(PLAY_CONTROL)
          clear()
          setRunning(false)
          return DEMO_DURATION_MS
        }
        return next
      })
    }, TICK_MS)
  }, [clear, hold])

  const stop = useCallback(() => {
    hold(PLAY_CONTROL)
    clear()
    setRunning(false)
    speech.current?.stop()
  }, [clear, hold])

  const play = useCallback(() => {
    hold(STOP_CONTROL)
    speech.current?.reset()
    speech.current = createSpeechTrack(REPLAY_LINES, browserSpeaker())
    setVoice(speech.current.available ? "synthesised" : "silent")
    start()
  }, [hold, start])

  useEffect(() => {
    speech.current?.tick(elapsedMs)
  }, [elapsedMs])

  useEffect(() => () => speech.current?.stop(), [])

  useEffect(() => clear, [clear])

  const settle = useCallback(() => {
    clear()
    setRunning(false)
    setElapsedMs(DEMO_DURATION_MS)
  }, [clear])

  useEffect(() => {
    if (!autoplay || autoplayed.current) {
      return
    }
    autoplayed.current = true
    if (globalThis.window?.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true) {
      settle()
      return
    }
    start()
    return () => {
      autoplayed.current = false
      clear()
    }
  }, [autoplay, clear, settle, start])

  const reached = elapsedMs >= DECISION_AT_MS
  const phase = phaseAt(elapsedMs)
  const fraction = Math.min(1, elapsedMs / DEMO_DURATION_MS)
  const stage =
    [...DEMO_STAGES].reverse().find((entry) => elapsedMs >= entry.atMs) ?? DEMO_STAGES[0]

  const ArmHeading = headingLevel === "h1" ? "h2" : "h3"
  const title = <Heading className={styles.title}>The forty-second demonstration</Heading>
  const lede = (
    <p className={styles.body}>
      One synthesised session, replayed through the whole pipeline. No microphone is needed and
      no second person has to be on the line. The caller said {SPOKEN_TRUTH}; the recognizer
      returned {RECOGNIZED_AS} and was {RECOGNIZER_CERTAINTY.toFixed(2)} certain of it. The two
      panels run the shipped policy and differ by one flag, the pair rule: both read the drug
      name back, and only one requires the caller to answer with the name.
    </p>
  )
  const context = (
    <>
      <ReplayNotice />
      <div className={styles.truth}>
        <p className={styles.truthLabel}>Ground truth for this replay</p>
        <p className={styles.truthText}>
          The human said {SPOKEN_TRUTH}. The recognizer heard {RECOGNIZED_AS} and reported{" "}
          {RECOGNIZER_CERTAINTY.toFixed(2)} certainty. Both drugs exist, both pass a catalogue
          lookup, and both are opioid pain medicines dosed differently, which is why a swap
          between them is dangerous.
        </p>
      </div>
    </>
  )

  return (
    <div className={styles.demo}>
      {autoplay ? (
        <div className={styles.lede}>
          {title}
          <ReplayTag />
        </div>
      ) : (
        <>
          <div className={styles.lede}>
            {title}
            {lede}
          </div>
          {context}
        </>
      )}
      <div className={styles.controls} ref={controls}>
        <Button tone="primary" size="large" onClick={play} disabled={running}>
          {elapsedMs === 0 ? "Play the replay" : "Play again"}
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
        {DEMO_ARMS.map((arm) => (
          <DemoArmPanel key={arm.id} arm={arm} phase={phase} headingLevel={ArmHeading} />
        ))}
      </div>

      <Captions lines={REPLAY_LINES} clockMs={elapsedMs} voice={voice} />
      <GateBanner decision={reached ? LASA_DECISION : null} candidate={LASA_CANDIDATE} />
      <div
        className={
          highlightedField(REPLAY_LINES, elapsedMs) === LASA_CANDIDATE.field
            ? styles.readingBack
            : styles.resting
        }
        data-reading-back={highlightedField(REPLAY_LINES, elapsedMs) === LASA_CANDIDATE.field}
      >
        <FieldCard
          candidate={LASA_CANDIDATE}
          decision={reached ? LASA_DECISION : null}
          evidence={phase === "settled" ? SHIPPED_EVIDENCE : null}
        />
      </div>

      {autoplay ? (
        <>
          <div className={styles.lede}>{lede}</div>
          {context}
        </>
      ) : null}
      <StillScenarioPicker />
      <StillKeytermsAb />
    </div>
  )
}
