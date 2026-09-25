import { ActionLink } from "@/shared/ui/primitives/action-link"
import styles from "./styles.module.css"

export function IntakePrompt() {
  return (
    <section className={styles.prompt}>
      <p className={styles.promptBody}>
        Say the patient, the drug, the strength and the sig. Each value is read back to you
        before it is written, and anything that cannot be proved is asked again.
      </p>
      <div className={styles.promptActions}>
        <ActionLink href="/?judge=1#replay" tone="primary" size="large">
          Run the replay
        </ActionLink>
        <ActionLink href="/how-it-works" size="large">
          How the check works
        </ActionLink>
      </div>
      <p className={styles.promptAside}>
        The replay needs no microphone and no second person, and it runs the same gate over a
        synthesised session built from the documented message shapes. It is labelled as a replay
        throughout, and it is the shortest way to see the product refuse a value.
      </p>
    </section>
  )
}
