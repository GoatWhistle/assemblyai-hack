import type { CSSProperties } from "react"
import { DRUG_NAME_THRESHOLD, ISMP_FIGURES } from "../figures"
import styles from "./styles.module.css"

type Step = {
  readonly tone: "validator" | "lasa" | "threshold" | "policy" | "pass"
  readonly when: string
  readonly outcome: string
}

const STEPS: readonly Step[] = [
  {
    tone: "validator",
    when: "Checksum or catalogue fails",
    outcome: "ask again, then spell out",
  },
  {
    tone: "lasa",
    when: "Name on the ISMP list",
    outcome: "name every partner; only a spoken name answers",
  },
  {
    tone: "threshold",
    when: `Confidence under ${DRUG_NAME_THRESHOLD.toFixed(2)}`,
    outcome: "read back",
  },
  { tone: "policy", when: "Field always read back", outcome: "an explicit yes confirms" },
  { tone: "pass", when: "Checksum passes", outcome: "written" },
]

export function RuleSlide() {
  const [catalogueCount, rest] = ISMP_FIGURES.catalogue.split(" (")
  const catalogueShare = rest?.replace(")", "") ?? ISMP_FIGURES.catalogue
  return (
    <div className={styles.layout}>
      <ol
        className={styles.ladder}
        aria-label="The gate's branches, in the order the code reads them"
      >
        {STEPS.map((step, index) => (
          <li className={`${styles.step} ${styles[step.tone]}`} key={step.when}>
            <span className={styles.index}>{index + 1}</span>
            <span className={styles.when}>{step.when}</span>
            <span className={styles.outcome}>{step.outcome}</span>
          </li>
        ))}
      </ol>

      <div className={styles.side}>
        <div className={styles.figure}>
          <p className={styles.value}>{ISMP_FIGURES.pairs}</p>
          <p className={styles.caption}>sound-alike pairs on the 2023 ISMP list</p>
        </div>
        <div className={styles.figure}>
          <p className={styles.value}>{catalogueShare}</p>
          <span className={styles.share} style={{ "--share": catalogueShare } as CSSProperties}>
            <span className={styles.shareFill} />
          </span>
          <p className={styles.caption}>
            of catalogue drugs carry a listed name, {catalogueCount}
          </p>
        </div>
      </div>
    </div>
  )
}
