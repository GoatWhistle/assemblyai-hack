import { useId } from "react"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Chip } from "@/shared/ui/primitives/chip"
import { MICROPHONE_FREE_STEPS, SCRIPT_STEPS } from "./script-steps"
import styles from "./styles.module.css"

export function DemoScript() {
  const titleId = useId()
  return (
    <section className={styles.script} aria-labelledby={titleId}>
      <div className={styles.lede}>
        <h2 className={styles.title} id={titleId}>
          Seven minutes, in order
        </h2>
        <p className={styles.body}>
          {MICROPHONE_FREE_STEPS} of these {SCRIPT_STEPS.length} steps need no microphone and no
          second person. Two do, and they are marked, so the sequence still finishes on a
          machine with no input device.
        </p>
      </div>

      <ol className={styles.steps}>
        {SCRIPT_STEPS.map((step, index) => (
          <li key={step.id} className={styles.step}>
            <span className={styles.ordinal} aria-hidden="true">
              {index + 1}
            </span>
            <div className={styles.content}>
              <p className={styles.action}>
                {step.action}
                {step.needsMicrophone ? <Chip tone="pending">needs a microphone</Chip> : null}
              </p>
              <p className={styles.watch}>
                <span className={styles.watchLabel}>what to watch</span>
                {step.watchFor}
              </p>
              {step.href === null || step.linkLabel === null ? null : (
                <ActionLink href={step.href} size="small">
                  {step.linkLabel}
                </ActionLink>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
