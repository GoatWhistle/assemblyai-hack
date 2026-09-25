import type { Metadata } from "next"
import { Compare } from "@/features/compare"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./styles.module.css"

const MAIN_ID = "main"

const COMPARE_HEADING = "What the gate changes, one moment at a time"

const COMPARE_LEDE =
  "Said, heard, the recognizer's own certainty, the gate's verdict with its reason code, and what a confidence threshold alone would have written. Where the two last columns disagree is where the gate earns its place."

export const metadata: Metadata = {
  title: "Compare",
  description:
    "Six synthesised moments side by side: what was said, what the recognizer heard, its certainty, the gate's verdict and reason code, and what would have entered the order without the gate.",
}

export default function ComparePage() {
  return (
    <div className={styles.shell}>
      <SiteHeader current="compare" />
      <main className={styles.page} id={MAIN_ID}>
        <section className={styles.hero}>
          <h1 className={styles.heading}>{COMPARE_HEADING}</h1>
          <p className={styles.lede}>{COMPARE_LEDE}</p>
        </section>
        <Compare />
        <Disclaimer />
      </main>
    </div>
  )
}
