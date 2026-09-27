import { FieldName } from "@/domain"
import { FIELD_LABEL, FIELD_PROOF_NOTE } from "@/features/intake/field-language"
import styles from "./styles.module.css"

const SHOWN: readonly FieldName[] = [
  FieldName.PrescriberNpi,
  FieldName.PrescriberDea,
  FieldName.DrugName,
  FieldName.Strength,
  FieldName.Sig,
  FieldName.PatientName,
]

export function ProofLadder() {
  return (
    <div className={styles.frame}>
      <dl className={styles.rows}>
        {SHOWN.map((field) => (
          <div key={field} className={styles.row}>
            <dt className={styles.field}>{FIELD_LABEL[field]}</dt>
            <dd className={styles.note}>{FIELD_PROOF_NOTE[field]}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
