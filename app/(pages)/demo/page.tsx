import type { Metadata } from "next"
import { JudgeTour } from "@/features/how-it-works/judge-tour"
import { JudgeDemo } from "@/features/judge-demo"
import { CALL_HREF } from "@/features/judge-demo/entry-routes"
import { HubNav, type HubSection } from "@/features/judge-demo/hub-nav"
import { InstantEntry } from "@/features/judge-demo/instant-entry"
import { JudgeHero } from "@/features/judge-demo/judge-hero"
import { KeytermsAb } from "@/features/judge-demo/keyterms-ab"
import { REPLAY_LENGTH_LABEL } from "@/features/judge-demo/replay-clock"
import { SayThese } from "@/features/judge-demo/say-these"
import { ScenarioPicker } from "@/features/judge-demo/scenario-picker"
import { RECORDING_PUBLISHED } from "@/features/recorded-replay/published"
import { RecordedSection } from "@/features/recorded-replay/recorded-section"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./styles.module.css"

const MAIN_ID = "main"
const REPLAY_ID = "replay"
const TOUR_ID = "tour"
const SAY_ID = "say"
const SCENARIOS_ID = "scenarios"
const KEYTERMS_ID = "keyterms"
const RECORDED_ID = "recorded"

const SECTIONS: readonly HubSection[] = [
  { id: REPLAY_ID, label: REPLAY_LENGTH_LABEL },
  { id: TOUR_ID, label: "90-second tour" },
  { id: SAY_ID, label: "What to say live" },
  { id: SCENARIOS_ID, label: "Scenarios" },
  { id: KEYTERMS_ID, label: "Keyterms A/B" },
  {
    id: RECORDED_ID,
    label: RECORDING_PUBLISHED ? "Recorded audio" : "Recorded audio (none yet)",
  },
]

export const metadata: Metadata = {
  title: "For judges: replay and evidence",
  description:
    "One synthesised session replayed through the whole pipeline, with the pair rule on and off side by side: the same read-back, answered by a name or by a yes. No microphone and no second person needed. Also the 90-second tour, one-button scenarios, the keyterms A/B and recorded audio.",
}

type DemoProps = {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DemoPage({ searchParams }: DemoProps) {
  const params = await searchParams
  const autoplay = params.autoplay === "1" || params.judge === "1"
  return (
    <div className={styles.shell}>
      <a className="skip-link" href={`#${REPLAY_ID}`}>
        Skip to the replay
      </a>
      <SiteHeader current="replay" />
      <main className={styles.page} id={MAIN_ID}>
        <JudgeHero headingLevel="h1" autoplaying={autoplay} />
        <HubNav sections={SECTIONS} />
        <section className={styles.section} id={REPLAY_ID} aria-label="Replay">
          {autoplay ? <InstantEntry /> : null}
          <JudgeDemo autoplay={autoplay} headingLevel="h2" />
        </section>
        <div className={styles.section} id={TOUR_ID}>
          <JudgeTour />
        </div>
        <div className={styles.section} id={SAY_ID}>
          <SayThese />
          <div className={styles.sayActions}>
            <ActionLink href={CALL_HREF} tone="primary">
              Try them on a live call
            </ActionLink>
          </div>
        </div>
        <div className={styles.section} id={SCENARIOS_ID}>
          <ScenarioPicker />
        </div>
        <div className={styles.section} id={KEYTERMS_ID}>
          <KeytermsAb />
        </div>
        <div className={styles.section} id={RECORDED_ID}>
          <h2 className={styles.heading}>Recorded audio</h2>
          <RecordedSection published={RECORDING_PUBLISHED} />
        </div>
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
