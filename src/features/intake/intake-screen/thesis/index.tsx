import styles from "./styles.module.css"

export const THESIS_TITLE = "Prescription intake that proves it did not mishear"

export const THESIS_PROMISE =
  "The drug, its strength, the quantity, how to take it and the patient's name are read back to you before they are written; an NPI or DEA number is checked by arithmetic instead. A drug name on a published look-alike list is asked again, even when the recognizer is certain."

export type ThesisTitleProps = {
  readonly started: boolean
}

export function ThesisTitle({ started }: ThesisTitleProps) {
  if (started) {
    return <h1 className="visually-hidden">Readback: {THESIS_TITLE.toLowerCase()}</h1>
  }
  return <h1 className={styles.title}>{THESIS_TITLE}</h1>
}

export function ThesisPromise() {
  return <p className={styles.promise}>{THESIS_PROMISE}</p>
}
