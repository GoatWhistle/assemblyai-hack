import { CHECKSUM_FIGURES } from "../figures"
import styles from "./styles.module.css"

type Proof = {
  readonly kind: "arithmetic" | "catalogue" | "voice"
  readonly fields: string
  readonly sample: string
  readonly check: string
  readonly figure: string
  readonly figureLabel: string
  readonly spoken: string
}

const PROOFS: readonly Proof[] = [
  {
    kind: "arithmetic",
    fields: "NPI",
    sample: "123456789",
    check: "3",
    figure: CHECKSUM_FIGURES.npiSubstitutions,
    figureLabel: "of mistyped digits caught by Luhn",
    spoken: "no read-back",
  },
  {
    kind: "arithmetic",
    fields: "DEA",
    sample: "AB123456",
    check: "3",
    figure: CHECKSUM_FIGURES.deaSubstitutions,
    figureLabel: "of mistyped digits caught by mod-10",
    spoken: "no read-back",
  },
  {
    kind: "catalogue",
    fields: "Drug and strength",
    sample: "lisinopril",
    check: "",
    figure: "exists",
    figureLabel: "in the FDA NDC catalogue; no check digit",
    spoken: "read back",
  },
  {
    kind: "voice",
    fields: "Patient name",
    sample: "Maria Lopez",
    check: "",
    figure: "voice",
    figureLabel: "no checksum, no catalogue",
    spoken: "read back",
  },
]

export function ProofSlide() {
  return (
    <ul className={styles.grid}>
      {PROOFS.map((proof) => (
        <li className={`${styles.card} ${styles[proof.kind]}`} key={proof.fields}>
          <p className={styles.kind}>{proof.kind}</p>
          <p className={styles.fields}>{proof.fields}</p>
          <p className={styles.sample}>
            {proof.sample}
            {proof.check === "" ? null : <span className={styles.check}>{proof.check}</span>}
          </p>
          <div className={styles.figure}>
            <p className={styles.value}>{proof.figure}</p>
            <p className={styles.label}>{proof.figureLabel}</p>
          </div>
          <p className={styles.spoken}>{proof.spoken}</p>
        </li>
      ))}
    </ul>
  )
}
