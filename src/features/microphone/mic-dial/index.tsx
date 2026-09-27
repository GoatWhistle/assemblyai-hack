import type { ReactNode } from "react"
import { MicState } from "../mic-state"
import styles from "./styles.module.css"

const TONE: Readonly<Record<MicState, string>> = Object.freeze({
  [MicState.Idle]: "ready",
  [MicState.Opening]: "quiet",
  [MicState.Listening]: "open",
  [MicState.AgentSpeaking]: "quiet",
  [MicState.Closing]: "quiet",
  [MicState.Blocked]: "blocked",
})

export type MicDialProps = {
  readonly state: MicState
  readonly children: ReactNode
}

export function MicDial({ state, children }: MicDialProps) {
  return (
    <div className={`${styles.dial} ${styles[TONE[state]] ?? ""}`}>
      <span className={styles.ripple} aria-hidden="true" />
      {children}
    </div>
  )
}
