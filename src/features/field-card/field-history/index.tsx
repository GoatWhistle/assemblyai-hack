import type { FieldCandidate, GateDecision } from "@/domain"
import { Timecode } from "@/shared/ui/data-display/timecode"
import styles from "./styles.module.css"

export type FieldHistoryProps = {
  readonly candidate: FieldCandidate
  readonly siblings: readonly FieldCandidate[]
  readonly decisions?: ReadonlyMap<string, GateDecision>
}

export function FieldHistory({ candidate, siblings, decisions }: FieldHistoryProps) {
  const attempts = siblings
    .filter((entry) => entry.field === candidate.field)
    .sort((a, b) => a.attempt - b.attempt)
  if (attempts.length < 2) {
    return null
  }
  return (
    <div className={styles.history}>
      <p className={styles.label}>Changes to this field</p>
      <ol className={styles.list}>
        {attempts.map((entry) => (
          <li
            key={entry.candidateId}
            className={styles.item}
            aria-current={entry.candidateId === candidate.candidateId ? "step" : undefined}
          >
            <span className={styles.attempt}>#{entry.attempt}</span>
            <span className={styles.value}>
              {String(entry.normalizedValue ?? entry.rawValue)}
            </span>
            <Timecode startMs={entry.provenance.startMs} endMs={entry.provenance.endMs} />
            <code className={styles.code}>
              {decisions?.get(entry.candidateId)?.reasonCode ?? "no decision yet"}
            </code>
          </li>
        ))}
      </ol>
    </div>
  )
}
