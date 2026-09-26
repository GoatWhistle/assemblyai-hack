import { lineAt, type ReplayLine } from "../replay-script"
import styles from "./styles.module.css"

export type CaptionsProps = {
  readonly lines: readonly ReplayLine[]
  readonly clockMs: number
  readonly voice: "synthesised" | "recorded" | "silent" | "muted"
}

const VOICE_NOTE: Readonly<Record<CaptionsProps["voice"], string>> = Object.freeze({
  synthesised:
    "Voices are synthesised by this browser, reading a synthesised session through the real gate.",
  recorded: "Recorded session replayed through the real gate.",
  silent: "This browser cannot synthesise speech, so the replay runs on captions alone.",
  muted:
    "Playing without sound, because browsers only allow sound after a click. Press play to hear it.",
})

export function Captions({ lines, clockMs, voice }: CaptionsProps) {
  const line = lineAt(lines, clockMs)
  return (
    <div className={styles.captions}>
      <p className={styles.voice}>{VOICE_NOTE[voice]}</p>
      <p className={styles.line} aria-live="polite">
        {line === null ? (
          <span className={styles.idle}>No one is speaking.</span>
        ) : (
          <span key={line.id} className={styles.spoken} data-motion="fade">
            <span className={styles.who}>{line.who === "agent" ? "Agent" : "Caller"}</span>{" "}
            {line.text}
          </span>
        )}
      </p>
    </div>
  )
}
