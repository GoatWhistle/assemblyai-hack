import type { Metadata } from "next"
import { JudgeDemo } from "@/features/judge-demo"
import { RecordedSection } from "@/features/recorded-replay/recorded-section"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./styles.module.css"

const MAIN_ID = "main"

export const metadata: Metadata = {
  title: "Demonstration",
  description:
    "One synthesised session replayed through the whole pipeline, with the pair rule on and off side by side: the same read-back, answered by a name or by a yes. No microphone and no second person needed.",
}

export default function DemoPage() {
  return (
    <div className={styles.shell}>
      <SiteHeader current="demo" />
      <main className={styles.page} id={MAIN_ID}>
        <JudgeDemo />
        <RecordedSection />
        <Disclaimer />
      </main>
    </div>
  )
}
