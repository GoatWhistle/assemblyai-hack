import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Chip } from "@/shared/ui/primitives/chip"
import { SCRIPT_STEPS } from "./script-steps"
import styles from "./styles.module.css"

export const WATCH_LABEL = "What to watch"

export function DemoScript() {
  return (
    <ol className={styles.steps}>
      {SCRIPT_STEPS.map((step, index) => (
        <li key={step.id} className={styles.step}>
          <span className={styles.ordinal} aria-hidden="true">
            {index + 1}
          </span>
          <Disclosure
            id={`step-${step.id}`}
            summary={
              <span className={styles.action}>
                {step.action}
                {step.needsMicrophone ? <Chip tone="pending">needs a microphone</Chip> : null}
              </span>
            }
          >
            <p className={styles.watch}>
              <span className={styles.watchLabel}>{WATCH_LABEL}</span>
              {step.watchFor}
            </p>
            {step.href === null || step.linkLabel === null ? null : (
              <div>
                <ActionLink href={step.href} size="small">
                  {step.linkLabel}
                </ActionLink>
              </div>
            )}
          </Disclosure>
        </li>
      ))}
    </ol>
  )
}
