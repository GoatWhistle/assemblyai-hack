import { FIELD_POLICIES, ReasonCode } from "@/domain"
import { FIELD_LABEL } from "@/features/intake/field-language"
import styles from "./styles.module.css"

export type GateReason = {
  readonly code: ReasonCode
  readonly label: string
  readonly title: string
  readonly body: string
  readonly pairRule: boolean
}

export const GATE_REASONS: readonly GateReason[] = Object.freeze([
  {
    code: ReasonCode.LowConfidence,
    label: "Unsure",
    title: "The recognizer was unsure",
    body: "The lowest certainty across the source words fell under the threshold for that field. The minimum is used rather than the mean, because a mean hides the single failed word that happens to be the drug name.",
    pairRule: false,
  },
  {
    code: ReasonCode.ValidatorChecksum,
    label: "A check failed",
    title: "A validator said no",
    body: "A checksum, a catalogue lookup or an internal consistency check rejected the value. NPI and DEA are arithmetic; a drug name is proved by existing in the catalogue, and we say so rather than calling it a checksum.",
    pairRule: false,
  },
  {
    code: ReasonCode.LasaHit,
    label: "Look-alike name",
    title: "The name is on a published pair",
    body: "This one fires even at certainty 1.00 and is read before the threshold, so a confident value cannot reach acceptance by being confident. The agent names both drugs, and only a spoken name answers.",
    pairRule: true,
  },
])

const STANDING = [...FIELD_POLICIES.values()]
  .filter((policy) => policy.readBackAlways)
  .map((policy) => FIELD_LABEL[policy.field].toLowerCase())

export const STANDING_READ_BACK_LINE = `${STANDING.length} fields are always read back once, whatever else happens (${ReasonCode.ReadBackRequired}): ${STANDING.slice(0, -1).join(", ")} and ${STANDING.at(-1)}. The three reasons below change which question is asked, and only the third will not take a yes for an answer.`

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
