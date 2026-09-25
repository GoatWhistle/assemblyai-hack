import styles from "./styles.module.css"

export type ThesisProps = {
  readonly started: boolean
}

export function Thesis({ started }: ThesisProps) {
  if (started) {
    return (
      <h1 className="visually-hidden">
        Readback: prescription intake that proves it did not mishear
      </h1>
    )
  }
  return (
    <div className={styles.thesis}>
      <h1 className={styles.thesisTitle}>Prescription intake that proves it did not mishear</h1>
      <p className={styles.thesisBody}>
        High confidence does not protect against two medicines that sound alike. A name on a
        regulator-published look-alike list is asked again even when the recognizer is certain.
      </p>
    </div>
  )
}
