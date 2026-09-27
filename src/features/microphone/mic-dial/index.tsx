import type { CSSProperties, ReactNode } from "react"
import { useReducedMotion } from "@/shared/ui/motion/use-reduced-motion"
import { MicState } from "../mic-state"
import styles from "./styles.module.css"

const TONE: Readonly<Record<MicState, string>> = Object.freeze({
  [MicState.Idle]: "ready",
  [MicState.Opening]: "quiet",
  [MicState.Listening]: "open",
  [MicState.AgentSpeaking]: "agent",
  [MicState.Closing]: "quiet",
  [MicState.Blocked]: "blocked",
})

export type MicDialProps = {
  readonly state: MicState
  readonly level?: number
  readonly children: ReactNode
}

export function voiceOf(state: MicState, level: number, reduced: boolean): number | null {
  if (reduced || state !== MicState.Listening) {
    return null
  }
  return Math.min(1, Math.max(0, level))
}

export function MicDial({ state, level = 0, children }: MicDialProps) {
  const reduced = useReducedMotion()
  const voice = voiceOf(state, level, reduced)
  return (
    <div
      className={`${styles.dial} ${styles[TONE[state]] ?? ""}`}
      style={voice === null ? undefined : ({ "--voice": voice.toFixed(3) } as CSSProperties)}
      data-voice={voice === null ? undefined : "live"}
    >
      <span className={styles.ripple} aria-hidden="true" />
      <span className={styles.trail} aria-hidden="true" />
      <span className={styles.voice} aria-hidden="true" />
      <span className={styles.emit} aria-hidden="true" />
      <span className={styles.emitLate} aria-hidden="true" />
      {children}
    </div>
  )
}
