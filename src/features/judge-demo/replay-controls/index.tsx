import type { RefObject } from "react"
import { Button } from "@/shared/ui/primitives/button"
import { DEMO_STAGES } from "../demo-arms"
import {
  DEMO_DURATION_MS,
  REPLAY_FROM_MS,
  REPLAY_LENGTH_MS,
  replaySeconds,
  sessionSeconds,
} from "../replay-clock"
import styles from "./styles.module.css"

export type ReplayMode = "rest" | "running" | "paused" | "ended"

const PRIMARY_LABEL: Readonly<Record<ReplayMode, string>> = Object.freeze({
  rest: "Play the replay",
  running: "Pause",
  paused: "Resume",
  ended: "Play again",
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

export function ReplayControls({
  mode,
  sessionMs,
  controls,
  onPrimary,
  onStop,
}: ReplayControlsProps) {
  const elapsed = Math.max(0, sessionMs - REPLAY_FROM_MS)
  const fraction = Math.min(1, elapsed / REPLAY_LENGTH_MS)
  const current = stageIndexAt(sessionMs)
  return (
    <div className={styles.controls}>
      <div className={styles.buttons} ref={controls}>
        <Button tone="primary" size="large" onClick={onPrimary}>
          {PRIMARY_LABEL[mode]}
        </Button>
        <Button onClick={onStop} disabled={mode !== "running" && mode !== "paused"}>
          Stop
        </Button>
      </div>
      <div className={styles.progress}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ transform: `scaleX(${fraction})` }} />
        </div>
        <p className={styles.clock}>
          <span>
            Replay {replaySeconds(elapsed)} of {replaySeconds(REPLAY_LENGTH_MS)}
          </span>
          <span className={styles.session}>
            session clock {sessionSeconds(sessionMs)} / {sessionSeconds(DEMO_DURATION_MS)}
          </span>
        </p>
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
      </div>
    </div>
  )
}
