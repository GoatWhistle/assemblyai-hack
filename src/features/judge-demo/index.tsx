"use client"

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { FieldCard } from "@/features/field-card"
import { GateBanner } from "@/features/gate-banner"
import { REDUCED_MOTION_QUERY } from "@/shared/ui/motion/use-reduced-motion"
import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { DemoArmPanel } from "./demo-arm"
import {
  DECISION_AT_MS,
  DEMO_ARMS,
  phaseAt,
  RECOGNIZED_AS,
  RECOGNIZER_CERTAINTY,
  SPOKEN_TRUTH,
} from "./demo-arms"
import { REPLAY_FROM_MS, REPLAY_LENGTH_LABEL, sessionSeconds } from "./replay-clock"
import { ReplayControls } from "./replay-controls"
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

const ASKED_EARLIER = Object.freeze({
  decision: LASA_DECISION,
  candidate: LASA_CANDIDATE,
  atSeconds: `${sessionSeconds(DECISION_AT_MS)} of the session`,
})

function reducedMotion(): boolean {
  return globalThis.window?.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true
}

export type JudgeDemoProps = {
  readonly autoplay?: boolean
  readonly headingLevel?: "h1" | "h2"
  readonly figure?: ReactNode
}

export function JudgeDemo({ autoplay = false, headingLevel = "h1", figure }: JudgeDemoProps) {
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
  const card = settledCard(phase, reached ? LASA_DECISION : null)
  const readingBack = highlightedField(REPLAY_LINES, sessionMs) === LASA_CANDIDATE.field
  const confirmed =
    phase === "settled" && card.evidence !== null
      ? { evidence: card.evidence, candidate: card.candidate, asked: ASKED_EARLIER }
      : null

  const ArmHeading = headingLevel === "h1" ? "h2" : "h3"
  const title = (
    <Heading className={headingLevel === "h1" ? styles.title : styles.sectionTitle}>
      {REPLAY_TITLE}
    </Heading>
  )
  const lede = (
    <p className={styles.body}>
      One synthesised session through the whole pipeline. The two panels differ by one flag, the
      pair rule: both read the drug name back, and only one needs the name as the answer. The
      clock starts {sessionSeconds(REPLAY_FROM_MS)} into the session, so it matches the word
      timecodes.
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
        <div className={styles.intro}>
          <div className={styles.lede}>
            {title}
            {lede}
          </div>
          {context}
        </div>
      )}
      <div className={styles.transport}>
        <ReplayControls
          mode={mode}
          sessionMs={sessionMs}
          controls={controls}
          onPrimary={primary}
          onStop={stop}
        />
      </div>

      <VerdictStrip phase={phase} />

      <div className={styles.split}>
        {DEMO_ARMS.map((arm) => (
          <DemoArmPanel key={arm.id} arm={arm} phase={phase} headingLevel={ArmHeading} />
        ))}
      </div>

      <div className={styles.captions}>
        <Captions lines={REPLAY_LINES} clockMs={sessionMs} voice={voice} />
      </div>
      {figure}
      <div className={styles.result}>
        <GateBanner
          decision={reached ? LASA_DECISION : null}
          candidate={LASA_CANDIDATE}
          confirmed={confirmed}
          live={false}
        />
        <div
          className={readingBack ? styles.readingBack : styles.resting}
          data-reading-back={readingBack}
        >
          <Disclosure
            summary={
              <>
                Show how this was decided
                <span className={styles.summaryNote}>
                  The field card: what proves the value, the recognizer&rsquo;s certainty and
                  the spoken words with their timecodes
                </span>
              </>
            }
          >
            <FieldCard
              key={card.candidate.candidateId}
              candidate={card.candidate}
              decision={card.decision}
              siblings={card.siblings}
              evidence={card.evidence}
              decisions={card.decisions}
            />
          </Disclosure>
        </div>
      </div>

      {autoplay ? (
        <div className={styles.intro}>
          <div className={styles.lede}>{lede}</div>
          {context}
        </div>
      ) : null}
    </div>
  )
}
