import { type ValidatorVerdict, VerdictOutcome } from "@/domain"
import styles from "./styles.module.css"

export const OUTCOME_HEADLINE: Readonly<Record<VerdictOutcome, string>> = Object.freeze({
  passed: "Independently verified",
  failed_checksum: "Check digit does not match",
  not_in_catalog: "Not found in the catalogue",
  format_invalid: "Format is not valid",
  inconsistent_combo: "This combination does not exist",
  not_applicable: "No validator exists for this field",
})

function toneClass(outcome: VerdictOutcome): string {
  if (outcome === VerdictOutcome.Passed) {
    return styles.passed ?? ""
  }
  if (outcome === VerdictOutcome.NotApplicable) {
    return styles.absent ?? ""
  }
  return styles.failed ?? ""
}

export type VerdictBlockProps = {
  readonly verdict: ValidatorVerdict
  readonly showEvidence?: boolean
}

export function VerdictBlock({ verdict, showEvidence = true }: VerdictBlockProps) {
  const entries = Object.entries(verdict.evidence)
  const classes = [styles.verdict, toneClass(verdict.outcome)]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  return (
    <div className={classes}>
      <div className={styles.head}>
        <p className={styles.outcome}>{OUTCOME_HEADLINE[verdict.outcome]}</p>
        <p className={styles.name}>{verdict.validatorName}</p>
      </div>
      <p className={styles.rule}>{verdict.ruleCited}</p>
      <p className={styles.detail}>{verdict.detail}</p>
      {showEvidence && entries.length > 0 ? (
        <dl className={styles.evidence}>
          {entries.map(([key, value]) => (
            <div key={key} style={{ display: "contents" }}>
              <dt className={styles.evidenceKey}>{key}</dt>
              <dd className={styles.evidenceValue}>{String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}
