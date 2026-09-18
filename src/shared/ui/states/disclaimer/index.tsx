import styles from "./styles.module.css"

export const DISCLAIMER_TITLE = "This is a technology demonstration, not a medical device"

export const DISCLAIMER_BODY =
  "Synthetic data only. No real patients, no real prescriptions, and nothing here is clinical advice. The catalogues are public reference data and the gate is a software invariant, not a regulatory approval."

export const DISCLAIMER_AFFILIATION =
  "This project quotes ISMP, the FDA, the Joint Commission and 21 CFR. It is not affiliated with, endorsed by, or reviewed by any of them. Those citations establish that read-back is an existing requirement; they establish nothing about this software."

export const DISCLAIMER_NO_REAL_DATA = "Do not enter real patient data into this application."

export function Disclaimer() {
  return (
    <aside className={styles.disclaimer}>
      <p className={styles.title}>{DISCLAIMER_TITLE}</p>
      <p className={styles.body}>{DISCLAIMER_BODY}</p>
      <p className={styles.body}>{DISCLAIMER_AFFILIATION}</p>
      <p className={styles.warning}>{DISCLAIMER_NO_REAL_DATA}</p>
    </aside>
  )
}
