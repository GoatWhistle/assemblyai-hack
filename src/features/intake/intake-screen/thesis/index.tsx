import styles from "./styles.module.css"

export const THESIS_TITLE = "Prescription intake that proves it did not mishear"

export const THESIS_PROMISE =
  "Each value is read back to you before it is written. A drug name on a published look-alike list is asked again, even when the recognizer is certain."

export type ThesisProps = {
  readonly started: boolean
}

export function Thesis({ started }: ThesisProps) {
  if (started) {
    return <h1 className="visually-hidden">Readback: {THESIS_TITLE.toLowerCase()}</h1>
  }
  return (
    <div className={styles.thesis}>
      <h1 className={styles.thesisTitle}>{THESIS_TITLE}</h1>
      <p className={styles.thesisBody}>{THESIS_PROMISE}</p>
    </div>
  )
}
