import { phaseLabel, type SessionFault, SessionPhase } from "../session-status"
import styles from "./styles.module.css"

export type PhaseDotProps = {
  readonly phase: SessionPhase
  readonly fault?: SessionFault | null
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

export function PhaseDot({ phase, fault = null }: PhaseDotProps) {
  return (
    <span className={styles.phase}>
      <span className={[styles.dot, dotClass(phase)].join(" ")} aria-hidden="true" />
      {phaseLabel(phase, fault)}
    </span>
  )
}
