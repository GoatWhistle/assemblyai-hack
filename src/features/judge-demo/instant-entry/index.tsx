import { useId } from "react"
import styles from "./styles.module.css"

export const INSTANT_ENTRY_HEADING = "You are already in the demonstration"

export const INSTANT_ENTRY_BODY =
  "Nothing to install, no account, no microphone and no second person on the line. The replay below started on its own; it is a session recorded from a live run, and the panels are the shipped gate deciding on it. If you prefer to drive it, the controls are there."

export const INSTANT_ENTRY_CASE =
  "The case is the one the product exists for: the recognizer reported its highest certainty and it was wrong about which of two look-alike medicines was spoken."

export type InstantEntryProps = {
  readonly headingLevel?: "h1" | "h2"
}

export function InstantEntry({ headingLevel = "h2" }: InstantEntryProps) {
  const headingId = useId()
  const Heading = headingLevel
  return (
    <section className={styles.entry} aria-labelledby={headingId}>
      <Heading className={styles.heading} id={headingId}>
        {INSTANT_ENTRY_HEADING}
      </Heading>
      <p className={styles.body}>{INSTANT_ENTRY_BODY}</p>
      <p className={styles.case}>{INSTANT_ENTRY_CASE}</p>
    </section>
  )
}
