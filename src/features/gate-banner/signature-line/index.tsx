import { ReasonCode } from "@/domain"
import { GateOutcome, type Signature } from "../signature"
import styles from "./styles.module.css"

const OUTCOME_CLASS: Readonly<Record<GateOutcome, string>> = {
  [GateOutcome.Pass]: styles.pass ?? "",
  [GateOutcome.ReAsk]: styles.reask ?? "",
  [GateOutcome.Refused]: styles.refused ?? "",
}

export type SignatureLineProps = {
  readonly signature: Signature
}

export function SignatureLine({ signature }: SignatureLineProps) {
  const lasa = signature.reasonCode === ReasonCode.LasaHit
  return (
    <div className={styles.signature}>
      <p
        className={[
          styles.outcome,
          OUTCOME_CLASS[signature.outcome],
          lasa ? styles.lasaOutcome : "",
        ].join(" ")}
      >
        <span className={styles.gateLabel}>Gate</span>
        <span className={styles.outcomeWord}>{signature.outcome}</span>
        <code className={styles.code}>{signature.reasonCode}</code>
      </p>
      <p className={styles.line}>
        <span className={styles.part}>
          Recognizer: <strong className={styles.heard}>{signature.heard}</strong>
        </span>
        <span className={[styles.certainty, lasa ? styles.outranked : ""].join(" ")}>
          certainty {signature.certainty}
        </span>
        <span aria-hidden="true" className={styles.arrow}>
          →
        </span>
        <span className={styles.part}>
          Gate: <strong>{signature.outcome}</strong>
        </span>
        <span className={styles.part}>{signature.ground}</span>
        {signature.candidates.length === 0 ? null : (
          <span className={styles.part}>candidates: {signature.candidates.join(" / ")}</span>
        )}
      </p>
    </div>
  )
}
