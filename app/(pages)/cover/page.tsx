import type { Metadata } from "next"
import { Wordmark } from "@/shared/ui/primitives/wordmark"
import { pageMetadata } from "@/site/page-metadata"
import styles from "./styles.module.css"

const MAIN_ID = "main"

const COVER_THESIS = "A voice agent that proves it did not mishear."

const STAGED_LABEL = "staged example"

const COVER_DISCLAIMER = "Technology demonstration, not a medical device. Synthetic data only."

const COVER_HOST = "readback-rx.vercel.app"

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
        <div className={styles.rings} aria-hidden="true">
          <span className={styles.ring} />
          <span className={styles.ring} />
          <span className={styles.ring} />
        </div>

        <div className={styles.brand}>
          <Wordmark size={72} />
          <p className={styles.wordmark}>Readback</p>
        </div>

        <div className={styles.copy}>
          <h1 className={styles.headline}>
            Certain. <span className={styles.hit}>Still wrong.</span>
          </h1>
          <p className={styles.thesis}>{COVER_THESIS}</p>
        </div>

        <figure className={styles.moment} aria-label="The gate overriding a certain recognizer">
          <div className={styles.row}>
            <p className={styles.label}>Caller said</p>
            <p className={styles.word}>hydromorphone</p>
          </div>

          <div className={styles.row}>
            <div className={styles.rowHead}>
              <p className={styles.label}>Recognizer heard</p>
              <p className={styles.staged}>{STAGED_LABEL}</p>
            </div>
            <p className={styles.word}>
              morphine <span className={styles.certainty}>certainty 1.00</span>
            </p>
          </div>

          <div className={styles.gate}>
            <div className={styles.gateHead}>
              <p className={styles.verdict}>RE-ASK</p>
              <p className={styles.reason}>Published look-alike pair, ISMP</p>
            </div>
            <ul className={styles.candidates} aria-label="Candidates the agent reads back">
              <li className={styles.candidate}>Hydromorphone</li>
              <li className={styles.candidate}>Morphine</li>
            </ul>
          </div>
        </figure>

        <div className={styles.foot}>
          <p className={styles.host}>{COVER_HOST}</p>
          <p>{COVER_DISCLAIMER}</p>
        </div>
      </main>
    </>
  )
}
