import Link from "next/link"
import { useId } from "react"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { SAY_LINE_ORDER, SAY_LINES } from "@/features/judge-demo/say-these/say-lines"
import styles from "./styles.module.css"

export const INTAKE_HINT =
  "Say the patient, the drug, the strength and the sig. Anything that cannot be proved is asked again."

export const JUDGE_LINK_LABEL = "Judging? Watch the 40-second replay"

export function IntakePrompt() {
  const examplesId = useId()
  return (
    <section className={styles.prompt} aria-label="What to say">
      <p className={styles.promptBody}>{INTAKE_HINT}</p>
      <p className={styles.examplesLabel} id={examplesId}>
        For example
      </p>
      <ul className={styles.examples} aria-labelledby={examplesId}>
        {SAY_LINE_ORDER.map((id) => (
          <li key={id} className={styles.example}>
            &ldquo;{SAY_LINES[id]}&rdquo;
          </li>
        ))}
      </ul>
      <Link className={styles.judge} href={REPLAY_ENTRY_HREF}>
        {JUDGE_LINK_LABEL}
      </Link>
    </section>
  )
}
