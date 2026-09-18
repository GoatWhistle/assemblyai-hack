import { PHASE_LABEL, SessionPhase } from "../session-status"
import styles from "./styles.module.css"

export type PhaseDotProps = {
  readonly phase: SessionPhase
}

function dotClass(phase: SessionPhase): string {
  if (phase === SessionPhase.Live) {
    return styles.dotLive ?? ""
  }
  if (phase === SessionPhase.Blocked) {
    return styles.dotFault ?? ""
  }
  if (phase === SessionPhase.Idle || phase === SessionPhase.Closed) {
    return ""
  }
  return styles.dotBusy ?? ""
}

export function PhaseDot({ phase }: PhaseDotProps) {
  return (
    <span className={styles.phase}>
      <span className={[styles.dot, dotClass(phase)].join(" ")} aria-hidden="true" />
      {PHASE_LABEL[phase]}
    </span>
  )
}
