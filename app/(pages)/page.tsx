import type { Metadata } from "next"
import { JudgeTour } from "@/features/how-it-works/judge-tour"
import { JudgeDemo } from "@/features/judge-demo"
import { InstantEntry } from "@/features/judge-demo/instant-entry"
import { JudgeHero } from "@/features/judge-demo/judge-hero"
import { SayThese } from "@/features/judge-demo/say-these"
import { RecordedSection } from "@/features/recorded-replay/recorded-section"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./styles.module.css"

const MAIN_ID = "main"
const REPLAY_ID = "replay"

export const metadata: Metadata = {
  title: { absolute: "Readback: a voice agent that proves it did not mishear" },
  description:
    "Prescription intake by voice where every value is proved by a validator or confirmed aloud. A look-alike drug name is asked again even at recognizer certainty 1.00.",
}

type HomeProps = {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function HomePage({ searchParams }: HomeProps) {
  const params = await searchParams
  const judge = params.judge === "1"
  return (
    <div className={styles.shell}>
      <a className="skip-link" href={`#${judge ? REPLAY_ID : MAIN_ID}`}>
        {judge ? "Skip to the replay" : "Skip to the content"}
      </a>
      <SiteHeader current="home" />
      <main className={styles.page} id={MAIN_ID}>
        {judge ? (
          <section className={styles.replay} id={REPLAY_ID} aria-label="Replay">
            <InstantEntry headingLevel="h1" />
            <JudgeDemo autoplay headingLevel="h2" />
            <RecordedSection />
          </section>
        ) : null}
        <JudgeHero headingLevel={judge ? "h2" : "h1"} />
        <SayThese />
        <JudgeTour />
        {judge ? null : (
          <section className={styles.replay} id={REPLAY_ID} aria-label="Replay">
            <JudgeDemo headingLevel="h2" />
            <RecordedSection />
          </section>
        )}
        <nav className={styles.onward} aria-label="Where to go next">
          <ActionLink href="/how-it-works" size="large">
            How the gate works
          </ActionLink>
          <ActionLink href="/compare" size="large">
            Compare with and without the gate
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
