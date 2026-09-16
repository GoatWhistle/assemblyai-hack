import Link from "next/link"
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
    body: "The lowest certainty across the source words fell under the threshold for that field.",
    tone: "asking",
  },
  {
    code: "E_VALIDATOR_CHECKSUM",
    title: "A validator said no",
    body: "A checksum, a catalogue lookup or an internal consistency check rejected the value.",
    tone: "escalated",
  },
  {
    code: "E_LASA_HIT",
    title: "The name is on a published pair",
    body: "This one fires even at certainty 1.00, because certainty describes acoustics and cannot tell two similar names apart.",
    tone: "lasa",
  },
]

export function IntakePrimer() {
  return (
    <section className={styles.primer}>
      <div className={styles.lede}>
        <h2 className={styles.title}>Three reasons the agent asks again</h2>
        <p className={styles.body}>
          Every value passes one decision function before it can enter the order. Nothing the
          model decides on its own can write a field.
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

      <p className={styles.footnote}>
        Start the call above, or{" "}
        <Link href="/demo" className={styles.link}>
          watch the recorded demonstration
        </Link>{" "}
        where a caller says Lisinopril and the recognizer returns Bisoprolol.
      </p>
    </section>
  )
}
