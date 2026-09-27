import { type CSSProperties, useId } from "react"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Heading } from "@/shared/ui/typography/heading"
import styles from "./styles.module.css"
import { TOUR_SECONDS, TOUR_STEPS } from "./tour-steps"

const ROWS = Math.ceil(TOUR_STEPS.length / 2)

export function JudgeTour() {
  const headingId = useId()
  return (
    <section className={styles.tour} aria-labelledby={headingId}>
      <Heading level={3} id={headingId}>
        The {TOUR_SECONDS}-second tour
      </Heading>
      <ol className={styles.steps} style={{ "--tour-rows": ROWS } as CSSProperties}>
        {TOUR_STEPS.map((step, index) => (
          <li key={step.id} className={styles.step} data-column-start={index % ROWS === 0}>
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
