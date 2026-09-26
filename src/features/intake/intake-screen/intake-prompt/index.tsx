import Link from "next/link"
import { useId } from "react"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { REPLAY_LENGTH_LABEL } from "@/features/judge-demo/replay-clock"
import styles from "./styles.module.css"

export const INTAKE_HINT =
  "Say the patient's name, the drug and its strength, how to take it, and the prescriber's NPI. Anything that cannot be proved is asked again."

export const CALL_EXAMPLE_NPI_DIGITS = "1234567893"

export const CALL_EXAMPLE_DRUG = "lisinopril"

export const CALL_EXAMPLES: readonly string[] = Object.freeze([
  "Patient Sam Rivera.",
  "Lisinopril, ten milligrams, one tablet by mouth once daily, thirty tablets.",
  "Prescriber NPI one two three four five six seven eight nine three.",
])

export const JUDGE_LINK_LABEL = `Judging? Watch the ${REPLAY_LENGTH_LABEL}`

export function IntakePrompt() {
  const examplesId = useId()
  return (
    <section className={styles.prompt} aria-label="What to say">
      <p className={styles.promptBody}>{INTAKE_HINT}</p>
      <p className={styles.examplesLabel} id={examplesId}>
        For example
      </p>
      <ul className={styles.examples} aria-labelledby={examplesId}>
        {CALL_EXAMPLES.map((line) => (
          <li key={line} className={styles.example}>
            &ldquo;{line}&rdquo;
          </li>
        ))}
      </ul>
      <Link className={styles.judge} href={REPLAY_ENTRY_HREF}>
        {JUDGE_LINK_LABEL}
      </Link>
    </section>
  )
}
