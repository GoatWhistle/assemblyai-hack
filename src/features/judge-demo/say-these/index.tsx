import { useId } from "react"
import { SAY_THESE } from "./phrases"
import styles from "./styles.module.css"

const SAY_THESE_HEADING = "Say these three things"

export function SayThese() {
  const headingId = useId()
  return (
    <section className={styles.block} aria-labelledby={headingId}>
      <h2 className={styles.heading} id={headingId}>
        {SAY_THESE_HEADING}
      </h2>
      <p className={styles.lede}>
        On the live call, these three sentences show the three ways a value is proved or
        stopped. The outcome and reason code beside each one come from the shipped gate
        function, run on this page.
      </p>
      <ol className={styles.list}>
        {SAY_THESE.map((entry) => (
          <li key={entry.id} className={styles.item}>
            <p className={styles.say}>&ldquo;{entry.say}&rdquo;</p>
            <p className={styles.expected}>
              <span className={styles.outcome}>{entry.outcome}</span>
              <code className={styles.code}>{entry.decision.reasonCode}</code>
            </p>
            <p className={styles.why}>{entry.expected}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
