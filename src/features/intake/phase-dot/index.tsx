import { phaseLabel, type SessionFault, SessionPhase } from "../session-status"
import styles from "./styles.module.css"

export const PAUSED_LABEL = "Live calls paused today"

export type PhaseDotProps = {
  readonly phase: SessionPhase
  readonly fault?: SessionFault | null
  readonly paused?: boolean
}

function dotClass(phase: SessionPhase): string {
  if (phase === SessionPhase.Live) {
    return styles.dotLive ?? ""
  }
  if (phase === SessionPhase.Blocked || phase === SessionPhase.Degraded) {
    return styles.dotFault ?? ""
  }
  if (phase === SessionPhase.Idle || phase === SessionPhase.Closed) {
    return ""
  }
  return styles.dotBusy ?? ""
}

export function PhaseDot({ phase, fault = null, paused = false }: PhaseDotProps) {
  const held = paused && phase === SessionPhase.Idle && fault === null
  if (phase === SessionPhase.Idle && fault === null && !held) {
    return null
  }
  return (
    <span className={styles.phase}>
      <span
        className={[styles.dot, held ? styles.dotFault : dotClass(phase)].join(" ")}
        aria-hidden="true"
      />
      {held ? PAUSED_LABEL : phaseLabel(phase, fault)}
    </span>
  )
}
