import type { Stance } from "../hypothesis-language"
import styles from "./styles.module.css"

export type ReasonStanceProps = {
  readonly stance: Stance
}

export function ReasonStance({ stance }: ReasonStanceProps) {
  return (
    <div className={styles.stance}>
      <p className={styles.known}>{stance.claim}</p>
      <p className={styles.unknown}>{stance.notClaim}</p>
      <p className={styles.asked}>{stance.askedOf}</p>
    </div>
  )
}
