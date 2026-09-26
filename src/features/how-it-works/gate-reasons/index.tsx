import { ReasonCode } from "@/domain"
import styles from "./styles.module.css"

export type GateReason = {
  readonly code: ReasonCode
  readonly title: string
  readonly body: string
  readonly pairRule: boolean
}

export const GATE_REASONS: readonly GateReason[] = Object.freeze([
  {
    code: ReasonCode.LowConfidence,
    title: "The recognizer was unsure",
    body: "The lowest certainty across the source words fell under the threshold for that field. The minimum is used rather than the mean, because a mean hides the single failed word that happens to be the drug name.",
    pairRule: false,
  },
  {
    code: ReasonCode.ValidatorChecksum,
    title: "A validator said no",
    body: "A checksum, a catalogue lookup or an internal consistency check rejected the value. NPI and DEA are arithmetic; a drug name is proved by existing in the catalogue, and we say so rather than calling it a checksum.",
    pairRule: false,
  },
  {
    code: ReasonCode.LasaHit,
    title: "The name is on a published pair",
    body: "This one fires even at certainty 1.00, because certainty describes acoustics and cannot tell two similar names apart. It is read before the threshold, so a confident value cannot reach acceptance by being confident.",
    pairRule: true,
  },
])

export function GateReasons() {
  return (
    <ol className={styles.reasons}>
      {GATE_REASONS.map((reason, index) => (
        <li
          key={reason.code}
          className={reason.pairRule ? `${styles.reason} ${styles.lasa}` : styles.reason}
        >
          <span className={styles.ordinal} aria-hidden="true">
            {index + 1}
          </span>
          <div className={styles.text}>
            <p className={styles.reasonTitle}>{reason.title}</p>
            <code className={styles.code}>{reason.code}</code>
            <p className={styles.reasonBody}>{reason.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
