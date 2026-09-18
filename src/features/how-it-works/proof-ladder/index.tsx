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
    <section className={styles.ladder}>
      <div className={styles.lede}>
        <h2 className={styles.title}>What counts as proof differs by field</h2>
        <p className={styles.body}>
          Where arithmetic exists, voice is not spent. Where no checksum and no catalogue exist,
          the spoken confirmation is the only proof there is.
        </p>
      </div>

      <dl className={styles.rows}>
        {SHOWN.map((field) => (
          <div key={field} className={styles.row}>
            <dt className={styles.field}>{FIELD_LABEL[field]}</dt>
            <dd className={styles.note}>{FIELD_PROOF_NOTE[field]}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
