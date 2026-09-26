"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FieldCard } from "@/features/field-card"
import { GateBanner } from "@/features/gate-banner"
import { REDUCED_MOTION_QUERY } from "@/shared/ui/motion/use-reduced-motion"
import { Button } from "@/shared/ui/primitives/button"
import { DemoArmPanel } from "./demo-arm"
import {
  DECISION_AT_MS,
  DEMO_ARMS,
  DEMO_STAGES,
  phaseAt,
  RECOGNIZED_AS,
  RECOGNIZER_CERTAINTY,
  SPOKEN_TRUTH,
} from "./demo-arms"
import {
  DEMO_DURATION_MS,
  REPLAY_FROM_MS,
  REPLAY_LENGTH_LABEL,
  sessionSeconds,
} from "./replay-clock"
import { ReplayNotice, ReplayTag } from "./replay-notice"
import { Captions } from "./replay-voice/captions"
import { highlightedField, REPLAY_LINES } from "./replay-voice/replay-script"
import {
  browserSpeaker,
  createSpeechTrack,
  type SpeechTrack,
} from "./replay-voice/speech-track"
import { LASA_CANDIDATE, LASA_DECISION } from "./scenario"
import { settledCard } from "./settled-card"
import styles from "./styles.module.css"
import { PLAY_CONTROL, useControlFocus } from "./use-control-focus"
import { useReplayClock } from "./use-replay-clock"
import { VerdictStrip } from "./verdict-strip"

export const REPLAY_TITLE = `The ${REPLAY_LENGTH_LABEL}`

const PRIMARY_LABEL = {
  rest: "Play the replay",
  running: "Pause",
  paused: "Resume",
  ended: "Play again",
} as const

function reducedMotion(): boolean {
  return globalThis.window?.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true
}

export type JudgeDemoProps = {
  readonly autoplay?: boolean
  readonly headingLevel?: "h1" | "h2"
}

export function JudgeDemo({ autoplay = false, headingLevel = "h1" }: JudgeDemoProps) {
  const Heading = headingLevel
  const autoplayed = useRef(false)
  const speech = useRef<SpeechTrack | null>(null)
  const [voice, setVoice] = useState<"synthesised" | "silent" | "muted">("muted")
  const holdRef = useRef<(index: number) => void>(() => undefined)
  const clock = useReplayClock(() => holdRef.current(PLAY_CONTROL))
  const { sessionMs, mode } = clock
  const { controls, hold } = useControlFocus(mode === "running")

  useEffect(() => {
    holdRef.current = hold
  }, [hold])

  const play = useCallback(() => {
    speech.current?.reset()
    speech.current = createSpeechTrack(REPLAY_LINES, browserSpeaker())
    setVoice(speech.current.available ? "synthesised" : "silent")
    clock.start()
  }, [clock.start])

  const primary = useCallback(() => {
    if (mode === "running") {
      speech.current?.stop()
      clock.pause()
      return
    }
    if (mode === "paused") {
      clock.resume()
      return
    }
    play()
  }, [mode, play, clock.pause, clock.resume])

  const stop = useCallback(() => {
    hold(PLAY_CONTROL)
    speech.current?.stop()
    clock.rewind()
  }, [hold, clock.rewind])

  useEffect(() => {
    speech.current?.tick(sessionMs)
  }, [sessionMs])

  useEffect(() => () => speech.current?.stop(), [])

  useEffect(() => {
    if (!autoplay || autoplayed.current) {
      return
    }
    autoplayed.current = true
    const reduced = reducedMotion()
    const section = controls.current?.closest("section") ?? null
    if (section !== null && typeof section.scrollIntoView === "function") {
      section.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" })
    }
    if (reduced) {
      clock.settle()
      return
    }
    clock.start()
    return () => {
      autoplayed.current = false
      clock.halt()
    }
  }, [autoplay, clock.settle, clock.start, clock.halt, controls])

  const reached = sessionMs >= DECISION_AT_MS
  const phase = phaseAt(sessionMs)
  const fraction = Math.min(
    1,
    (sessionMs - REPLAY_FROM_MS) / (DEMO_DURATION_MS - REPLAY_FROM_MS),
  )
  const stage =
    [...DEMO_STAGES].reverse().find((entry) => sessionMs >= entry.atMs) ?? DEMO_STAGES[0]
  const card = settledCard(phase, reached ? LASA_DECISION : null)
  const readingBack = highlightedField(REPLAY_LINES, sessionMs) === LASA_CANDIDATE.field

  const ArmHeading = headingLevel === "h1" ? "h2" : "h3"
  const title = (
    <Heading className={headingLevel === "h1" ? styles.title : styles.sectionTitle}>
      {REPLAY_TITLE}
    </Heading>
  )
  const lede = (
    <p className={styles.body}>
      One synthesised session, replayed through the whole pipeline, with no microphone and no
      second person on the line. The two panels run the shipped policy and differ by one flag,
      the pair rule: both read the drug name back, and only one requires the caller to answer
      with the name. The clock is session time: the replay picks up{" "}
      {sessionSeconds(REPLAY_FROM_MS)} into the session, just before the caller names the drug.
    </p>
  )
  const context = (
    <div className={styles.context}>
      <div className={styles.truth}>
        <p className={styles.truthLabel}>Ground truth for this replay</p>
        <p className={styles.truthText}>
          The human said {SPOKEN_TRUTH}. The recognizer heard {RECOGNIZED_AS} and reported{" "}
          {RECOGNIZER_CERTAINTY.toFixed(2)} certainty.
        </p>
        <p className={styles.truthNote}>
          Both drugs exist, both pass a catalogue lookup, and both are opioid pain medicines
          dosed differently, which is why a swap between them is dangerous.
        </p>
      </div>
      <ReplayNotice />
    </div>
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
      <div className={styles.controls}>
        <div className={styles.buttons} ref={controls}>
          <Button tone="primary" size="large" onClick={primary}>
            {PRIMARY_LABEL[mode]}
          </Button>
          <Button onClick={stop} disabled={mode !== "running" && mode !== "paused"}>
            Stop
          </Button>
        </div>
        <div className={styles.progress}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ transform: `scaleX(${fraction})` }} />
          </div>
          <p className={styles.progressLabel}>
            {sessionSeconds(sessionMs)} / {sessionSeconds(DEMO_DURATION_MS)}
            {stage === undefined ? "" : ` · ${stage.label}`}
          </p>
        </div>
      </div>

      <VerdictStrip phase={phase} />

      <div className={styles.split}>
        {DEMO_ARMS.map((arm) => (
          <DemoArmPanel key={arm.id} arm={arm} phase={phase} headingLevel={ArmHeading} />
        ))}
      </div>

      <Captions lines={REPLAY_LINES} clockMs={sessionMs} voice={voice} />
      <GateBanner decision={reached ? LASA_DECISION : null} candidate={LASA_CANDIDATE} />
      <div
        className={readingBack ? styles.readingBack : styles.resting}
        data-reading-back={readingBack}
      >
        <FieldCard
          key={card.candidate.candidateId}
          candidate={card.candidate}
          decision={card.decision}
          siblings={card.siblings}
          evidence={card.evidence}
          decisions={card.decisions}
        />
      </div>

      {autoplay ? (
        <>
          <div className={styles.lede}>{lede}</div>
          {context}
        </>
      ) : null}
    </div>
  )
}
