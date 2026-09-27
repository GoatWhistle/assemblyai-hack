"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FieldCard } from "@/features/field-card"
import { GateBanner } from "@/features/gate-banner"
import { REDUCED_MOTION_QUERY } from "@/shared/ui/motion/use-reduced-motion"
import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { DemoArmPanel } from "./demo-arm"
import { DECISION_AT_MS, DEMO_ARMS, phaseAt } from "./demo-arms"
import { sessionSeconds } from "./replay-clock"
import { ReplayControls } from "./replay-controls"
import { ReplayAfterword, ReplayHead } from "./replay-head"
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
import { useAnchoredToggle } from "./use-anchored-toggle"
import { PLAY_CONTROL, useControlFocus } from "./use-control-focus"
import { useReplayClock } from "./use-replay-clock"
import { VerdictStrip } from "./verdict-strip"

export { REPLAY_TITLE } from "./replay-head"

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
}

export function JudgeDemo({ autoplay = false, headingLevel = "h1" }: JudgeDemoProps) {
  const autoplayed = useRef(false)
  const speech = useRef<SpeechTrack | null>(null)
  const [voice, setVoice] = useState<"synthesised" | "silent" | "muted">("muted")
  const holdRef = useRef<(index: number) => void>(() => undefined)
  const clock = useReplayClock(() => holdRef.current(PLAY_CONTROL))
  const { sessionMs, mode } = clock
  const { controls, hold } = useControlFocus(mode === "running")
  const result = useAnchoredToggle<HTMLDivElement>()

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

  const restart = useCallback(() => {
    speech.current?.stop()
    play()
  }, [play])

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
  const decided = reached || confirmed !== null
  const banner = (
    <GateBanner
      decision={reached ? LASA_DECISION : null}
      candidate={LASA_CANDIDATE}
      confirmed={confirmed}
      live={false}
    />
  )

  return (
    <div className={styles.demo}>
      <ReplayHead level={headingLevel === "h1" ? 1 : 2} autoplay={autoplay} />
      <div className={styles.transport}>
        <ReplayControls
          mode={mode}
          sessionMs={sessionMs}
          controls={controls}
          onPrimary={primary}
          onRestart={restart}
          onStop={stop}
        />
      </div>

      <div className={styles.stage}>
        <VerdictStrip phase={phase} />
        <div className={styles.split}>
          {DEMO_ARMS.map((arm) => (
            <DemoArmPanel key={arm.id} arm={arm} phase={phase} headingLevel={ArmHeading} />
          ))}
        </div>
      </div>

      <div className={styles.captions}>
        <Captions lines={REPLAY_LINES} clockMs={sessionMs} voice={voice} />
      </div>
      <div
        ref={result}
        className={decided ? `${styles.result} ${styles.decided}` : styles.result}
      >
        {decided ? banner : null}
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
            {decided ? null : banner}
            <FieldCard
              key={card.candidate.candidateId}
              candidate={card.candidate}
              decision={card.decision}
              siblings={card.siblings}
              evidence={card.evidence}
              decisions={card.decisions}
              explainedBeside={decided}
            />
          </Disclosure>
        </div>
      </div>

      {autoplay ? <ReplayAfterword /> : null}
    </div>
  )
}
