import { type Patience, patienceFor } from "@/realtime/patience"
import { Wordmark } from "@/shared/ui/primitives/wordmark"
import { FinishAnswer } from "../finish-answer"
import { LevelMeter } from "../level-meter"
import { isBusy, isOpen, MIC_COPY, MicState } from "../mic-state"
import { useMicKeys } from "../use-mic-keys"
import styles from "./styles.module.css"

export type MicConsoleProps = {
  readonly state: MicState
  readonly level: number
  readonly elapsedMs: number
  readonly echoDiscards: number
  readonly patience?: Patience
  readonly onStart?: () => void
  readonly onStop?: () => void
  readonly onFinishAnswer?: () => void
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
  patience,
  onStart,
  onStop,
  onFinishAnswer,
}: MicConsoleProps) {
  const open = isOpen(state)
  const busy = isBusy(state)
  const copy = MIC_COPY[state]
  const listening = state === MicState.Listening
  const active = patience ?? patienceFor(null)

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
          {open ? <StopGlyph /> : <Wordmark size={44} />}
        </span>
      </button>

      <LevelMeter level={level} state={state} />

      <h2 className={styles.headline}>{copy.headline}</h2>
      <p className={styles.detail}>{copy.detail}</p>

      <FinishAnswer live={listening} patience={active} onFinish={onFinishAnswer} />

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

      {open || elapsedMs > 0 ? (
        <dl className={styles.telemetry}>
          <div className={styles.metric}>
            <dt>Call length</dt>
            <dd className={styles.numeral}>{formatElapsed(elapsedMs)}</dd>
          </div>
          {echoDiscards > 0 ? (
            <div className={styles.metric}>
              <dt>Agent heard itself</dt>
              <dd className={styles.numeral}>{echoDiscards}</dd>
            </div>
          ) : null}
          {open ? (
            <div className={styles.metric}>
              <dt>Patience on this field</dt>
              <dd className={styles.numeral} title={active.why}>
                {active.name} {active.minSilence}-{active.maxSilence} ms
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
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
