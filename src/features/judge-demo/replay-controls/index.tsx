import type { CSSProperties, RefObject } from "react"
import { Button } from "@/shared/ui/primitives/button"
import { DECISION_AT_MS, DEMO_STAGES } from "../demo-arms"
import {
  DEMO_DURATION_MS,
  REPLAY_FROM_MS,
  REPLAY_LENGTH_MS,
  replaySeconds,
  sessionSeconds,
} from "../replay-clock"
import styles from "./styles.module.css"
import { type TransportGlyph, TransportIcon } from "./transport-icon"

export type ReplayMode = "rest" | "running" | "paused" | "ended"

const PRIMARY_LABEL: Readonly<Record<ReplayMode, string>> = Object.freeze({
  rest: "Play the replay",
  running: "Pause",
  paused: "Resume",
  ended: "Play again",
})

const PRIMARY_GLYPH: Readonly<Record<ReplayMode, TransportGlyph>> = Object.freeze({
  rest: "play",
  running: "pause",
  paused: "play",
  ended: "again",
})

const MODE_LABEL: Readonly<Record<ReplayMode, string>> = Object.freeze({
  rest: "Ready",
  running: "Playing",
  paused: "Paused",
  ended: "Finished",
})

export type ReplayControlsProps = {
  readonly mode: ReplayMode
  readonly sessionMs: number
  readonly controls: RefObject<HTMLDivElement | null>
  readonly onPrimary: () => void
  readonly onStop: () => void
}

export function stageIndexAt(sessionMs: number): number {
  let index = 0
  DEMO_STAGES.forEach((entry, at) => {
    if (sessionMs >= entry.atMs) {
      index = at
    }
  })
  return index
}

function along(sessionMs: number): number {
  return Math.min(1, Math.max(0, sessionMs - REPLAY_FROM_MS) / REPLAY_LENGTH_MS)
}

export function ReplayControls({
  mode,
  sessionMs,
  controls,
  onPrimary,
  onStop,
}: ReplayControlsProps) {
  const elapsed = Math.max(0, sessionMs - REPLAY_FROM_MS)
  const fraction = along(sessionMs)
  const current = stageIndexAt(sessionMs)
  return (
    <div className={styles.controls} data-mode={mode}>
      <div className={styles.buttons} ref={controls}>
        <Button tone="primary" size="large" onClick={onPrimary}>
          <TransportIcon glyph={PRIMARY_GLYPH[mode]} />
          {PRIMARY_LABEL[mode]}
        </Button>
        <Button
          size="large"
          onClick={onStop}
          disabled={mode !== "running" && mode !== "paused"}
        >
          <TransportIcon glyph="stop" />
          Stop
        </Button>
      </div>
      <p className={styles.clock}>
        <span className={styles.mode}>
          {mode === "ended" && elapsed === 0 ? "Stopped" : MODE_LABEL[mode]}
        </span>
        <span className={styles.elapsed}>
          Replay {replaySeconds(elapsed)} of {replaySeconds(REPLAY_LENGTH_MS)}
        </span>
      </p>
      <div className={styles.track} aria-hidden="true">
        <div className={styles.rail}>
          <div className={styles.fill} style={{ transform: `scaleX(${fraction})` }} />
        </div>
        {DEMO_STAGES.slice(1).map((entry) => (
          <span
            key={entry.atMs}
            className={entry.atMs === DECISION_AT_MS ? styles.decision : styles.tick}
            data-reached={sessionMs >= entry.atMs}
            style={{ "--at": along(entry.atMs) } as CSSProperties}
          />
        ))}
      </div>
      <div className={styles.foot}>
        <p className={styles.stages}>
          {DEMO_STAGES.map((entry, index) => (
            <span
              key={entry.atMs}
              className={index === current ? styles.stage : styles.stageHidden}
              aria-hidden={index === current ? undefined : true}
            >
              {entry.label}
            </span>
          ))}
        </p>
        <p className={styles.session}>
          session clock {sessionSeconds(sessionMs)} / {sessionSeconds(DEMO_DURATION_MS)}
        </p>
      </div>
    </div>
  )
}
