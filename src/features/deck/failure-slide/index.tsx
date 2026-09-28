import { DRUG_NAME_THRESHOLD } from "../figures"
import styles from "./styles.module.css"

const CHECKS = [
  { name: "Threshold", test: `1.00 > ${DRUG_NAME_THRESHOLD.toFixed(2)}` },
  { name: "Catalogue", test: "morphine exists" },
  { name: "Read-back", test: "“Correct?” “Yes.”" },
] as const

export function FailureSlide() {
  return (
    <div className={styles.layout}>
      <div className={styles.exchange}>
        <div className={styles.side}>
          <p className={styles.label}>Said</p>
          <p className={styles.word}>hydromorphone</p>
        </div>
        <div className={styles.side}>
          <p className={styles.label}>
            Heard <span className={styles.staged}>staged example</span>
          </p>
          <p className={styles.word}>
            morphine <span className={styles.certainty}>certainty 1.00</span>
          </p>
        </div>
      </div>

      <ol className={styles.checks}>
        {CHECKS.map((check) => (
          <li className={styles.check} key={check.name}>
            <span className={styles.passed}>passed</span>
            <span className={styles.checkName}>{check.name}</span>
            <span className={styles.checkTest}>{check.test}</span>
          </li>
        ))}
        <li className={`${styles.check} ${styles.outcome}`}>
          <span className={styles.written}>ordered</span>
          <span className={styles.outcomeValue}>morphine</span>
        </li>
      </ol>
    </div>
  )
}
