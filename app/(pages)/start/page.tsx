import type { Metadata } from "next"
import { JudgeDemo } from "@/features/judge-demo"
import { InstantEntry } from "@/features/judge-demo/instant-entry"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./styles.module.css"

const MAIN_ID = "main"

export const metadata: Metadata = {
  title: "Start here",
  description:
    "One URL that lands on the case the product exists for, already running. No microphone, no account, no configuration: a recorded session where the recognizer was certain and wrong.",
}

export default function StartPage() {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Skip to the replay
      </a>
      <SiteHeader current="start" />
      <main className={styles.page} id={MAIN_ID}>
        <InstantEntry headingLevel="h1" />
        <JudgeDemo autoplay headingLevel="h2" />
        <nav className={styles.onward} aria-label="Where to go next">
          <ActionLink href="/how-it-works" size="large">
            Attack the gate yourself
          </ActionLink>
          <ActionLink href="/" size="large">
            Take an order with a microphone
          </ActionLink>
          <ActionLink href="/metrics" size="large">
            Read the measurements
          </ActionLink>
        </nav>
        <Disclaimer />
      </main>
    </div>
  )
}
