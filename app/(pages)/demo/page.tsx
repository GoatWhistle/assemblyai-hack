import type { Metadata } from "next"
import { JudgeTour } from "@/features/how-it-works/judge-tour"
import { JudgeDemo } from "@/features/judge-demo"
import { CALL_HREF } from "@/features/judge-demo/entry-routes"
import { InstantEntry } from "@/features/judge-demo/instant-entry"
import { JudgeHero } from "@/features/judge-demo/judge-hero"
import { KeytermsAb } from "@/features/judge-demo/keyterms-ab"
import { PairRuleCatch } from "@/features/judge-demo/pair-rule-catch"
import { SayThese } from "@/features/judge-demo/say-these"
import { ScenarioPicker } from "@/features/judge-demo/scenario-picker"
import { abCatch } from "@/features/metrics/report-figures"
import { RECORDING_PUBLISHED } from "@/features/recorded-replay/published"
import { RecordedSection } from "@/features/recorded-replay/recorded-section"
import { PageShell } from "@/shared/ui/layout/page-shell"
import { type TabItem, Tabs } from "@/shared/ui/navigation/tabs"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import { Heading } from "@/shared/ui/typography/heading"
import { pageMetadata } from "@/site/page-metadata"
import styles from "./styles.module.css"

const MAIN_ID = "main"
const REPLAY_ID = "replay"
const TOUR_ID = "tour"
const SAY_ID = "say"
const SCENARIOS_ID = "scenarios"
const KEYTERMS_ID = "keyterms"
const RECORDED_ID = "recorded"

const MORE: readonly TabItem[] = [
  {
    id: SAY_ID,
    label: "Say these three things",
    panel: (
      <div className={styles.panel}>
        <SayThese />
        <div className={styles.actions}>
          <ActionLink href={CALL_HREF}>Try them on a live call</ActionLink>
        </div>
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
        <Heading level={2}>Recorded audio</Heading>
        <RecordedSection published={RECORDING_PUBLISHED} />
      </div>
    ),
  },
]

export const metadata: Metadata = pageMetadata({
  title: "For judges: replay and evidence",
  description:
    "One synthesised session replayed through the whole pipeline, with the pair rule on and off side by side: the same read-back, answered by a name or by a yes. No microphone and no second person needed. Also the 90-second tour, one-button scenarios, the keyterms A/B and recorded audio.",
  path: "/demo",
})

type DemoProps = {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DemoPage({ searchParams }: DemoProps) {
  const params = await searchParams
  const autoplay = params.autoplay === "1" || params.judge === "1"
  const ab = abCatch()
  const figure = ab === null ? null : <PairRuleCatch without={ab.without} shipped={ab.with} />
  return (
    <>
      <a className="skip-link" href={`#${REPLAY_ID}`}>
        Skip to the replay
      </a>
      <PageShell current="replay">
        <main className={styles.page} id={MAIN_ID}>
          <JudgeHero headingLevel="h1" autoplaying={autoplay} />
          <section className={styles.replay} id={REPLAY_ID} aria-label="Replay">
            {autoplay ? <InstantEntry /> : null}
            <JudgeDemo autoplay={autoplay} headingLevel="h2" figure={figure} />
          </section>
          <div className={styles.more}>
            <Tabs label="More of the demonstration" items={MORE} defaultId={SAY_ID} anchored />
          </div>
          <nav className={styles.onward} aria-label="Where to go next">
            <ActionLink href="/how-it-works" icon="forward">
              How the gate works
            </ActionLink>
            <ActionLink href="/compare" icon="forward">
              Compare with and without the gate
            </ActionLink>
            <ActionLink href="/metrics" icon="forward">
              Read the measurements
            </ActionLink>
            <ActionLink href="/docs/limitations" icon="forward">
              What this cannot prove
            </ActionLink>
            <ActionLink href="/docs/threat-model" icon="forward">
              Threat model
            </ActionLink>
          </nav>
          <Disclaimer />
        </main>
      </PageShell>
    </>
  )
}
