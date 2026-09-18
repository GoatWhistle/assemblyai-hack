import styles from "./styles.module.css"

type Reason = {
  readonly code: string
  readonly title: string
  readonly body: string
  readonly tone: string
}

const REASONS: readonly Reason[] = [
  {
    code: "E_LOW_CONFIDENCE",
    title: "The recognizer was unsure",
    body: "The lowest certainty across the source words fell under the threshold for that field. The minimum is used rather than the mean, because a mean hides the single failed word that happens to be the drug name.",
    tone: "asking",
  },
  {
    code: "E_VALIDATOR_CHECKSUM",
    title: "A validator said no",
    body: "A checksum, a catalogue lookup or an internal consistency check rejected the value. NPI and DEA are arithmetic; a drug name is proved by existing in the catalogue, and we say so rather than calling it a checksum.",
    tone: "escalated",
  },
  {
    code: "E_LASA_HIT",
    title: "The name is on a published pair",
    body: "This one fires even at certainty 1.00, because certainty describes acoustics and cannot tell two similar names apart. It is read before the threshold, so a confident value cannot reach acceptance by being confident.",
    tone: "lasa",
  },
]

export function GateReasons() {
  return (
    <section className={styles.primer}>
      <div className={styles.lede}>
        <h2 className={styles.title}>Three reasons the agent asks again</h2>
        <p className={styles.body}>
          Every value passes one decision function before it can enter the order. The three
          reasons are not interchangeable, and the third is the point of the product.
        </p>
      </div>

      <ol className={styles.reasons}>
        {REASONS.map((reason) => (
          <li key={reason.code} className={`${styles.reason} ${styles[reason.tone] ?? ""}`}>
            <code className={styles.code}>{reason.code}</code>
            <p className={styles.reasonTitle}>{reason.title}</p>
            <p className={styles.reasonBody}>{reason.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
