import { useId } from "react"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import styles from "./styles.module.css"

const REPLAY_ENTRY_HREF = "/?judge=1#replay"
const LIVE_ENTRY_HREF = "/live"

const HERO_TITLE = "A prescription taken by voice, and proof it was not misheard"

const HERO_BODY =
  "A recognizer can be certain and wrong: for example, the caller says hydromorphone and it returns morphine at certainty 1.00. Readback asks which of the listed names was meant whenever a drug name falls in a look-alike pair published by ISMP, and a yes does not answer it, however confident the recognizer was. It writes nothing a validator or the caller has not proved."

const WHO_PAYS =
  "Who pays: a pharmacy or telepharmacy service, per verified order. That is our hypothesis, not yet validated with buyers."

const WHO_GETS =
  "Who gets the order: the pharmacist, with every value's spoken words, timecodes and proof attached, before anything is dispensed."

export type JudgeHeroProps = {
  readonly headingLevel?: "h1" | "h2"
}

export function JudgeHero({ headingLevel = "h1" }: JudgeHeroProps) {
  const headingId = useId()
  const Heading = headingLevel
  return (
    <section className={styles.hero} aria-labelledby={headingId}>
      <Heading className={styles.title} id={headingId}>
        {HERO_TITLE}
      </Heading>
      <p className={styles.body}>{HERO_BODY}</p>
      <ul className={styles.parties}>
        <li>{WHO_PAYS}</li>
        <li>{WHO_GETS}</li>
      </ul>
      <div className={styles.actions}>
        <ActionLink href={REPLAY_ENTRY_HREF} tone="primary" size="large">
          Watch the 40-second case — no mic, no key
        </ActionLink>
        <ActionLink href={LIVE_ENTRY_HREF} size="large">
          Talk to it live
        </ActionLink>
      </div>
    </section>
  )
}
