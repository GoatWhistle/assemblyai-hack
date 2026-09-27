import type { Metadata } from "next"
import { pageMetadata } from "@/site/page-metadata"
import styles from "./styles.module.css"

const MAIN_ID = "main"

const COVER_THESIS =
  "A voice agent that takes a prescription over the phone and proves it did not mishear."

const STAGED_LABEL = "staged example"

const COVER_DISCLAIMER = "Technology demonstration, not a medical device. Synthetic data only."

export const metadata: Metadata = pageMetadata({
  title: "Cover",
  description: "The 1920 by 1080 cover image for the Readback submission.",
  robots: { index: false },
})

export default function CoverPage() {
  return (
    <>
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Skip to the cover
      </a>
      <main className={styles.canvas} id={MAIN_ID}>
        <div className={styles.copy}>
          <p className={styles.wordmark}>Readback</p>
          <h1 className={styles.thesis}>{COVER_THESIS}</h1>
          <p className={styles.claim}>
            High recognizer certainty does not protect against names that sound alike. A drug
            name in a published look-alike, sound-alike pair is asked again, even at certainty
            1.00.
          </p>
        </div>

        <figure className={styles.moment} aria-label="The gate overriding a certain recognizer">
          <div className={styles.stage}>
            <div className={styles.stageHead}>
              <p className={styles.label}>Recognizer</p>
              <p className={styles.staged}>{STAGED_LABEL}</p>
            </div>
            <p className={styles.heard}>Morphine</p>
            <p className={styles.certainty}>certainty 1.00</p>
          </div>

          <div className={styles.link} aria-hidden="true" />

          <div className={styles.gate}>
            <div className={styles.gateHead}>
              <p className={styles.label}>Gate</p>
              <p className={styles.verdict}>RE-ASK</p>
            </div>
            <p className={styles.reason}>Published look-alike pair, ISMP</p>
            <ul className={styles.candidates} aria-label="Candidates the agent reads back">
              <li className={styles.candidate}>Hydromorphone</li>
              <li className={styles.candidate}>Morphine</li>
            </ul>
          </div>

          <figcaption className={styles.caption}>
            Nothing enters the order until the caller says which one.
          </figcaption>
        </figure>

        <p className={styles.disclaimer}>{COVER_DISCLAIMER}</p>
      </main>
    </>
  )
}
