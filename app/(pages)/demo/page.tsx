import type { Metadata } from "next"
import { JudgeTour } from "@/features/how-it-works/judge-tour"
import { JudgeDemo } from "@/features/judge-demo"
import { InstantEntry } from "@/features/judge-demo/instant-entry"
import { JudgeHero } from "@/features/judge-demo/judge-hero"
import { KeytermsAb } from "@/features/judge-demo/keyterms-ab"
import { PairRuleCatch } from "@/features/judge-demo/pair-rule-catch"
import { SayThese } from "@/features/judge-demo/say-these"
import { ScenarioPicker } from "@/features/judge-demo/scenario-picker"
import { falseAskTally } from "@/features/metrics/measured-figures"
import { abCatch } from "@/features/metrics/report-figures"
import { RECORDING_PUBLISHED } from "@/features/recorded-replay/published"
import { RecordedSection } from "@/features/recorded-replay/recorded-section"
import { PageShell } from "@/shared/ui/layout/page-shell"
import { type TabItem, Tabs } from "@/shared/ui/navigation/tabs"
import { Heading, Lede } from "@/shared/ui/typography/heading"
import { pageMetadata } from "@/site/page-metadata"
import styles from "./styles.module.css"

const MAIN_ID = "main"
const REPLAY_ID = "replay"
const TOUR_ID = "tour"
const SAY_ID = "say"
const SCENARIOS_ID = "scenarios"
const KEYTERMS_ID = "keyterms"
const RECORDED_ID = "recorded"
const MORE_TITLE_ID = "more-title"

const MORE: readonly TabItem[] = [
  {
    id: SAY_ID,
    label: "Say these three things",
    panel: (
      <div className={styles.panel}>
        <SayThese />
      </div>
    ),
  },
  { id: TOUR_ID, label: "90-second tour", panel: <JudgeTour /> },
  { id: SCENARIOS_ID, label: "One button, one scenario", panel: <ScenarioPicker /> },
  { id: KEYTERMS_ID, label: "Keyterms A/B", panel: <KeytermsAb /> },
  {
    id: RECORDED_ID,
    label: RECORDING_PUBLISHED ? "Recorded audio" : "Recorded audio (none yet)",
    panel: (
      <div className={styles.panel}>
        <Heading level={3}>Recorded audio</Heading>
        <RecordedSection published={RECORDING_PUBLISHED} />
      </div>
    ),
  },
]

export const metadata: Metadata = pageMetadata({
  title: "For judges: replay and evidence",
  description:
    "One synthesised call replayed through the shipped gate with the pair rule on and off, side by side: the recognizer hears morphine at certainty 1.00 where the caller said hydromorphone. Then the measured catch and its cost in seconds, and more to try: three sentences for a live call, the 90-second tour, one-button scenarios, the keyterms A/B and recorded audio.",
  path: "/demo",
})

type DemoProps = {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DemoPage({ searchParams }: DemoProps) {
  const params = await searchParams
  const autoplay = params.autoplay === "1" || params.judge === "1"
  const ab = abCatch()
  return (
    <>
      <a className="skip-link" href={`#${REPLAY_ID}`}>
        Skip to the replay
      </a>
      <PageShell current="replay">
        <main className={styles.page} id={MAIN_ID}>
          <JudgeHero headingLevel="h1" />
          <section className={styles.replay} id={REPLAY_ID} aria-label="Replay">
            {autoplay ? <InstantEntry /> : null}
            <JudgeDemo autoplay={autoplay} headingLevel="h2" />
          </section>
          {ab === null ? null : (
            <div className={styles.section}>
              <PairRuleCatch without={ab.without} shipped={ab.with} tally={falseAskTally()} />
            </div>
          )}
          <section className={styles.section} aria-labelledby={MORE_TITLE_ID}>
            <div className={styles.head}>
              <Heading level={2} id={MORE_TITLE_ID}>
                More of the demonstration
              </Heading>
              <Lede>
                Sentences to try on a live call, a guided tour, one-button scenarios on the
                shipped gate, the keyterms A/B and recorded audio.
              </Lede>
            </div>
            <Tabs label="More of the demonstration" items={MORE} defaultId={SAY_ID} anchored />
          </section>
        </main>
      </PageShell>
    </>
  )
}
