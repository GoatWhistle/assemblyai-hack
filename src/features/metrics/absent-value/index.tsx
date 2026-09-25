import { NOT_MEASURED_LABEL } from "../benchmark-row"
import styles from "./styles.module.css"

const ABSENT_MARK = "—"

export function AbsentValue() {
  return (
    <span className={styles.absent} role="img" aria-label={NOT_MEASURED_LABEL}>
      {ABSENT_MARK}
    </span>
  )
}
