import { Wordmark } from "@/shared/ui/primitives/wordmark"
import styles from "./styles.module.css"

export function TitleSlide() {
  return (
    <>
      <p className={styles.tagline}>Prescription intake that proves it did not mishear</p>
      <p className={styles.event}>AssemblyAI Voice Agent Hackathon</p>
      <div className={styles.orb} aria-hidden="true">
        <svg
          className={styles.rings}
          viewBox="0 0 1000 1000"
          aria-hidden="true"
          focusable="false"
        >
          <circle className={styles.ringNear} cx="500" cy="500" r="250" />
          <circle className={styles.ringFar} cx="500" cy="500" r="367" />
          <circle className={styles.ringFar} cx="500" cy="500" r="498" />
        </svg>
        <span className={styles.disc}>
          <Wordmark size={160} />
        </span>
      </div>
    </>
  )
}
