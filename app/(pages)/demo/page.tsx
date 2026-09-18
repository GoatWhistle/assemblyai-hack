import type { Metadata } from "next"
import { JudgeDemo } from "@/features/judge-demo"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./styles.module.css"

const MAIN_ID = "main"

export const metadata: Metadata = {
  title: "Demonstration",
  description:
    "One recorded session replayed through the whole pipeline, with the gate on and off side by side. No microphone and no second person needed.",
}

export default function DemoPage() {
  return (
    <div className={styles.shell}>
      <SiteHeader current="demo" />
      <main className={styles.page} id={MAIN_ID}>
        <JudgeDemo />
        <Disclaimer />
      </main>
    </div>
  )
}
