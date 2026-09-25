"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { LiveRecording } from "@/domain"
import { GateBanner } from "@/features/gate-banner"
import { FIELD_LABEL } from "@/features/intake/field-language"
import { Captions } from "@/features/judge-demo/replay-voice/captions"
import { highlightedField } from "@/features/judge-demo/replay-voice/replay-script"
import { modeLabel } from "@/features/telemetry/session-mode"
import { Button } from "@/shared/ui/primitives/button"
import { Chip } from "@/shared/ui/primitives/chip"
import { playRecording, type RecordedPlayback } from "../recorded-audio"
import { durationOf, recordedLines, stateAt } from "../recorded-lines"
import styles from "./styles.module.css"

const TICK_MS = 100

export type RecordedPlayerProps = {
  readonly recording: LiveRecording
  readonly play?: (recording: LiveRecording) => RecordedPlayback
}

export function RecordedPlayer({ recording, play = playRecording }: RecordedPlayerProps) {
  const [clockMs, setClockMs] = useState(0)
  const [running, setRunning] = useState(false)
  const playback = useRef<RecordedPlayback | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const duration = useMemo(() => durationOf(recording), [recording])
  const lines = useMemo(
    () =>
      recordedLines(
        recording,
        (atMs) => stateAt(recording.states, atMs).snapshot?.awaitingConfirmation?.field ?? null,
      ),
    [recording],
  )

  const halt = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current)
      timer.current = null
    }
    void playback.current?.stop()
    playback.current = null
    setRunning(false)
  }, [])

  const start = useCallback(() => {
    halt()
    const started = play(recording)
    playback.current = started
    setRunning(true)
    timer.current = setInterval(() => {
      const now = started.clockMs()
      setClockMs(now)
      if (now >= duration) {
        halt()
      }
    }, TICK_MS)
  }, [duration, halt, play, recording])

  useEffect(() => halt, [halt])

  const state = stateAt(recording.states, clockMs)
  const candidate =
    state.decision === null
      ? null
      : (state.candidates.find((entry) => entry.candidateId === state.decision?.candidateId) ??
        null)
  const date = recording.recordedAt.slice(0, 10)
  const reading = highlightedField(lines, clockMs)

  return (
    <section className={styles.player} aria-label="Recorded live session">
      <div className={styles.head}>
        <Chip tone="plain">
          {modeLabel({ kind: "replay", recordedOn: date, source: "live" })}
        </Chip>
        <Button tone="primary" onClick={start} disabled={running}>
          Play the recorded call
        </Button>
        <Button onClick={halt} disabled={!running}>
          Stop
        </Button>
        <span className={styles.clock}>
          {(clockMs / 1000).toFixed(1)}s / {(duration / 1000).toFixed(1)}s
        </span>
      </div>
      <Captions lines={lines} clockMs={clockMs} voice="recorded" />
      {reading === null ? null : (
        <p className={styles.reading}>Reading back: {FIELD_LABEL[reading]}</p>
      )}
      <GateBanner decision={state.decision} candidate={candidate} />
    </section>
  )
}
