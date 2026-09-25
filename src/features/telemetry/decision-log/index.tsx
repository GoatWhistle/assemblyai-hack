import type { GateDecision } from "@/domain"
import { outcomeOf } from "@/features/gate-banner/signature"
import { FIELD_LABEL } from "@/features/intake/field-language"
import styles from "./styles.module.css"

export type DecisionLogProps = {
  readonly decisions: readonly GateDecision[]
}

export function DecisionLog({ decisions }: DecisionLogProps) {
  if (decisions.length === 0) {
    return <p className={styles.empty}>The gate has not decided anything in this session.</p>
  }
  return (
    <ol className={styles.log} aria-label="Gate decisions in order">
      {decisions.map((decision, index) => (
        <li
          key={`${decision.candidateId}-${decision.reasonCode}-${index}`}
          className={styles.row}
        >
          <span className={styles.index}>{index + 1}</span>
          <span className={styles.field}>{FIELD_LABEL[decision.field]}</span>
          <span className={styles.outcome}>{outcomeOf(decision)}</span>
          <code className={styles.code}>{decision.reasonCode}</code>
        </li>
      ))}
    </ol>
  )
}
