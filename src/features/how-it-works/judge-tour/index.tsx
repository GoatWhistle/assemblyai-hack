import { useId } from "react"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Heading } from "@/shared/ui/typography/heading"
import styles from "./styles.module.css"
import { TOUR_SECONDS, TOUR_STEPS } from "./tour-steps"

export function JudgeTour() {
  const headingId = useId()
  return (
    <section className={styles.tour} aria-labelledby={headingId}>
      <Heading level={2} id={headingId}>
        The {TOUR_SECONDS}-second tour
      </Heading>
      <ol className={styles.steps}>
        {TOUR_STEPS.map((step, index) => (
          <li key={step.id} className={styles.step}>
            <span className={styles.number} aria-hidden="true">
              {index + 1}
            </span>
            <div className={styles.text}>
              <p className={styles.click}>
                {step.click} <span className={styles.seconds}>{step.seconds} s</span>
                {step.needsMicrophone ? (
                  <span className={styles.seconds}> · needs a microphone</span>
                ) : null}
              </p>
              <p className={styles.expect}>{step.expect}</p>
            </div>
            <ActionLink href={step.href}>{step.go}</ActionLink>
          </li>
        ))}
      </ol>
    </section>
  )
}
