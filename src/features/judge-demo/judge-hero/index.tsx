import { useId } from "react"
import { THESIS_TITLE } from "@/features/intake/intake-screen/thesis"
import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Heading, Lede } from "@/shared/ui/typography/heading"
import { CALL_HREF, REPLAY_ENTRY_HREF } from "../entry-routes"
import { REPLAY_LENGTH_LABEL } from "../replay-clock"
import styles from "./styles.module.css"

export const HERO_CLAIM =
  "High recognizer certainty does not protect against two medicines that sound alike."

export const WATCH_LABEL = `Watch the ${REPLAY_LENGTH_LABEL}`

export const CALL_LABEL = "Start a call"

const HERO_BODY =
  "A recognizer can be certain and wrong: for example, the caller says hydromorphone and it returns morphine at certainty 1.00. Readback asks which of the listed names was meant whenever a drug name falls in a look-alike pair published by ISMP, and a yes does not answer it, however confident the recognizer was. It writes nothing a validator or the caller has not proved."

const WHO_PAYS =
  "Who pays: a pharmacy or telepharmacy service, per verified order. That is our hypothesis, not yet validated with buyers."

const WHO_GETS =
  "Who gets the order: the pharmacist, with every value's spoken words, timecodes and proof attached, before anything is dispensed."

export type JudgeHeroProps = {
  readonly headingLevel?: "h1" | "h2"
  readonly autoplaying?: boolean
}

export function JudgeHero({ headingLevel = "h1", autoplaying = false }: JudgeHeroProps) {
  const headingId = useId()
  return (
    <section className={styles.hero} aria-labelledby={headingId}>
      <div className={styles.lead}>
        <div className={styles.title}>
          <Heading level={headingLevel === "h1" ? 1 : 2} id={headingId}>
            {THESIS_TITLE}
          </Heading>
        </div>
        <Lede rank="page">{HERO_CLAIM}</Lede>
        <Disclosure summary="The mechanism and the business case">
          <p className={styles.body}>{HERO_BODY}</p>
          <ul className={styles.parties}>
            <li className={styles.party}>{WHO_PAYS}</li>
            <li className={styles.party}>{WHO_GETS}</li>
          </ul>
        </Disclosure>
      </div>
      <div className={styles.go}>
        <div className={styles.actions}>
          {autoplaying ? null : (
            <ActionLink href={REPLAY_ENTRY_HREF} tone="primary" size="large">
              {WATCH_LABEL}
            </ActionLink>
          )}
          <ActionLink href={CALL_HREF} size="large">
            {CALL_LABEL}
          </ActionLink>
        </div>
        {autoplaying ? null : (
          <p className={styles.caption}>The replay needs no microphone and no key.</p>
        )}
      </div>
    </section>
  )
}
