import { LevelMeter } from "../level-meter"
import { isBusy, isOpen, MIC_COPY, MicState } from "../mic-state"
import { useMicKeys } from "../use-mic-keys"
import styles from "./styles.module.css"

export type MicConsoleProps = {
  readonly state: MicState
  readonly level: number
  readonly elapsedMs: number
  readonly echoDiscards: number
  readonly onStart?: () => void
  readonly onStop?: () => void
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

const STATE_CLASS: Readonly<Record<MicState, string>> = Object.freeze({
  [MicState.Idle]: "idle",
  [MicState.Opening]: "opening",
  [MicState.Listening]: "listening",
  [MicState.AgentSpeaking]: "speaking",
  [MicState.Closing]: "closing",
  [MicState.Blocked]: "blocked",
})

export function MicConsole({
  state,
  level,
  elapsedMs,
  echoDiscards,
  onStart,
  onStop,
}: MicConsoleProps) {
  const open = isOpen(state)
  const busy = isBusy(state)
  const copy = MIC_COPY[state]

  useMicKeys({ busy, open, onStart, onStop })

  return (
    <section className={`${styles.console} ${styles[STATE_CLASS[state]] ?? ""}`}>
      <button
        type="button"
        className={styles.trigger}
        onClick={open ? onStop : onStart}
        disabled={busy}
        aria-pressed={open}
        aria-label={copy.action}
      >
        <span className={styles.glyph} aria-hidden="true">
          {open ? <StopGlyph /> : <MicGlyph />}
        </span>
      </button>

      <LevelMeter level={level} state={state} />

      <h2 className={styles.headline}>{copy.headline}</h2>
      <p className={styles.detail}>{copy.detail}</p>

      <p className={styles.keys}>
        <kbd className={styles.kbd}>Space</kbd>
        <span>{open ? "stop" : "start"}</span>
        {open ? (
          <>
            <kbd className={styles.kbd}>Esc</kbd>
            <span>stop</span>
          </>
        ) : null}
      </p>

      <dl className={styles.telemetry}>
        <div className={styles.metric}>
          <dt>Elapsed</dt>
          <dd className={styles.numeral}>{formatElapsed(elapsedMs)}</dd>
        </div>
        <div className={styles.metric}>
          <dt>Echo turns discarded</dt>
          <dd className={styles.numeral}>{echoDiscards}</dd>
        </div>
      </dl>
    </section>
  )
}

function MicGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="34"
      height="34"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="9" y="2.75" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" strokeLinecap="round" />
      <path d="M12 18v3.25" strokeLinecap="round" />
    </svg>
  )
}

function StopGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="30"
      height="30"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  )
}
