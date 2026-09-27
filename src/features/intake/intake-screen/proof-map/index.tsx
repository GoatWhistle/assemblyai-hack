import { useId } from "react"
import { Criticality, type FieldName, type FieldPolicy, policyFor } from "@/domain"
import { FIELD_LABEL, FIELD_PROOF_NOTE, INTAKE_ORDER } from "../../field-language"
import styles from "./styles.module.css"

export const PROOF_MAP_TITLE = "What each field must pass before it is written"

export const PROOF_MAP_LEDE =
  "Nothing reaches the order on the agent's word. Every value is proved one of four ways, and the call only commits when every required field is."

export const ProofKind = {
  Named: "named",
  Voice: "voice",
  Arithmetic: "arithmetic",
  Catalogue: "catalogue",
} as const

export type ProofKind = (typeof ProofKind)[keyof typeof ProofKind]

export const PROOF_GROUP: Readonly<
  Record<ProofKind, { readonly title: string; readonly detail: string }>
> = Object.freeze({
  [ProofKind.Named]: {
    title: "Asked by name, never by yes",
    detail:
      "A drug on the ISMP list of confused drug names is asked again even at full recognizer confidence, and only the name you say answers it.",
  },
  [ProofKind.Voice]: {
    title: "Read back to you",
    detail: "You hear the value and confirm it aloud before it is written.",
  },
  [ProofKind.Arithmetic]: {
    title: "Checked by arithmetic",
    detail: "A checksum catches a wrong digit, so the number is not read back unless it fails.",
  },
  [ProofKind.Catalogue]: {
    title: "Checked against the catalogue",
    detail:
      "The value has to exist with the rest of the order in the NDC catalogue, or sit in a documented range. Asked again when it does not.",
  },
})

const ARITHMETIC_VALIDATORS: readonly string[] = ["npi_luhn", "dea_mod10"]

export function proofKindOf(policy: FieldPolicy): ProofKind {
  if (policy.lasaChecked) {
    return ProofKind.Named
  }
  if (ARITHMETIC_VALIDATORS.includes(policy.validator)) {
    return ProofKind.Arithmetic
  }
  return policy.readBackAlways ? ProofKind.Voice : ProofKind.Catalogue
}

const KIND_ORDER: readonly ProofKind[] = [
  ProofKind.Named,
  ProofKind.Voice,
  ProofKind.Arithmetic,
  ProofKind.Catalogue,
]

function fieldsOf(kind: ProofKind): readonly FieldName[] {
  return INTAKE_ORDER.filter((field) => proofKindOf(policyFor(field)) === kind)
}

export function ProofMap() {
  const titleId = useId()
  return (
    <section className={styles.map} aria-labelledby={titleId}>
      <div className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {PROOF_MAP_TITLE}
        </h2>
        <p className={styles.lede}>{PROOF_MAP_LEDE}</p>
      </div>
      <div className={styles.groups}>
        {KIND_ORDER.map((kind) => (
          <section key={kind} className={`${styles.group} ${styles[kind] ?? ""}`}>
            <h3 className={styles.groupTitle}>
              <span className={styles.mark} aria-hidden="true" />
              {PROOF_GROUP[kind].title}
            </h3>
            <p className={styles.groupDetail}>{PROOF_GROUP[kind].detail}</p>
            <dl className={styles.fields}>
              {fieldsOf(kind).map((field) => (
                <div key={field} className={styles.field}>
                  <dt className={styles.fieldName}>
                    {FIELD_LABEL[field]}
                    {policyFor(field).criticality === Criticality.Critical ? null : (
                      <span className={styles.optional}>not required to commit</span>
                    )}
                  </dt>
                  <dd className={styles.fieldNote}>{FIELD_PROOF_NOTE[field]}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </section>
  )
}
