import { useCallback, useState } from "react"
import type { Patience } from "@/realtime/patience"
import { useReducedMotion } from "@/shared/ui/motion/use-reduced-motion"
import styles from "./styles.module.css"

const FINISH_LABEL = "I have finished this answer"

const FINISH_CONFIRMED_MS = 900

export type FinishAnswerProps = {
  readonly live: boolean
  readonly patience: Patience
  readonly onFinish?: () => void
}

function waitingSentence(patience: Patience): string {
  return `Without it the recognizer waits up to ${patience.maxSilence} ms of silence on this field.`
}

export function FinishAnswer({ live, patience, onFinish }: FinishAnswerProps) {
  const reduced = useReducedMotion()
  const [sent, setSent] = useState(false)

  const press = useCallback(() => {
    onFinish?.()
    setSent(true)
    globalThis.window?.setTimeout(() => setSent(false), FINISH_CONFIRMED_MS)
  }, [onFinish])

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={[styles.button, reduced ? styles.still : styles.animated].join(" ")}
        onClick={press}
        disabled={!live}
      >
        {FINISH_LABEL}
      </button>
      <p className={styles.note} aria-live="polite">
        {live
          ? sent
            ? "Endpoint forced. The turn closes now instead of on a timeout."
            : waitingSentence(patience)
          : "Available once the line is open. Nothing is being recognized yet, so there is no turn to close."}
      </p>
    </div>
  )
}
