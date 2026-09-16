import styles from "./styles.module.css"

export const DISCLAIMER_TITLE = "This is a technology demonstration, not a medical device"

export const DISCLAIMER_BODY =
  "Synthetic data only. No real patients, no real prescriptions, and nothing here is clinical advice. The catalogues are public reference data and the gate is a software invariant, not a regulatory approval."

export function Disclaimer() {
  return (
    <aside className={styles.disclaimer}>
      <p className={styles.title}>{DISCLAIMER_TITLE}</p>
      <p className={styles.body}>{DISCLAIMER_BODY}</p>
    </aside>
  )
}
