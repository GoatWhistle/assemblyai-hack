import type { ReactNode } from "react"
import { type Patience, patienceFor } from "@/realtime/patience"
import { Swap } from "@/shared/ui/motion/swap"
import { Wordmark } from "@/shared/ui/primitives/wordmark"
import { FinishAnswer } from "../finish-answer"
import { KeyHint } from "../key-hint"
import { LevelMeter } from "../level-meter"
import { MicDial } from "../mic-dial"
import { isBusy, isCancellable, isOpen, MIC_COPY, MicState } from "../mic-state"
import { useMicKeys } from "../use-mic-keys"
import styles from "./styles.module.css"

export type MicConsoleProps = {
  readonly state: MicState
  readonly level: number
  readonly elapsedMs: number
  readonly echoDiscards: number
  readonly patience?: Patience | undefined
  readonly notice?: ReactNode
  readonly available?: boolean
  readonly onStart?: (() => void) | undefined
  readonly onStop?: (() => void) | undefined
  readonly onFinishAnswer?: (() => void) | undefined
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

const KEY_SHORTCUT: Readonly<Record<MicState, string | null>> = Object.freeze({
  [MicState.Idle]: "Space",
  [MicState.Opening]: "Escape",
  [MicState.Listening]: "Escape",
  [MicState.AgentSpeaking]: "Escape",
  [MicState.Closing]: null,
  [MicState.Blocked]: null,
})

function messageKey(notice: ReactNode, state: MicState): string {
  return notice === undefined || notice === null ? state : "notice"
}

export function MicConsole({
  state,
  level,
  elapsedMs,
  echoDiscards,
  patience,
  notice,
  available = true,
  onStart,
  onStop,
  onFinishAnswer,
}: MicConsoleProps) {
  const open = isOpen(state)
  const cancellable = isCancellable(state)
  const copy = MIC_COPY[state]
  const listening = state === MicState.Listening
  const active = patience ?? patienceFor(null)
  const shortcut = available ? KEY_SHORTCUT[state] : null
  const inert = state === MicState.Closing || !available
  const press = open || cancellable ? onStop : onStart

  useMicKeys({
    busy: isBusy(state),
    open,
    cancellable,
    onStart: available ? onStart : undefined,
    onStop,
  })

  return (
    <section className={`${styles.console} ${styles[STATE_CLASS[state]] ?? ""}`}>
      <MicDial state={state} level={level}>
        <button
          type="button"
          className={styles.trigger}
          onClick={() => {
            if (!inert) {
              press?.()
            }
          }}
          aria-disabled={inert ? true : undefined}
          aria-label={copy.action}
          aria-keyshortcuts={shortcut ?? undefined}
        >
          <span className={styles.glyph} aria-hidden="true">
            {open ? <StopGlyph /> : <Wordmark size={44} />}
          </span>
        </button>
      </MicDial>

      <LevelMeter level={level} state={state} />

      <Swap swapKey={messageKey(notice, state)} className={styles.message}>
        {notice ?? (
          <>
            <h2 className={styles.headline}>{copy.headline}</h2>
            <p className={styles.detail}>{copy.detail}</p>
          </>
        )}
      </Swap>

      {open ? (
        <FinishAnswer live={listening} patience={active} onFinish={onFinishAnswer} />
      ) : null}

      <KeyHint cancellable={cancellable} />

      {open || elapsedMs > 0 ? (
        <MicTelemetry
          open={open}
          elapsedMs={elapsedMs}
          echoDiscards={echoDiscards}
          patience={active}
        />
      ) : null}
    </section>
  )
}

type MicTelemetryProps = {
  readonly open: boolean
  readonly elapsedMs: number
  readonly echoDiscards: number
  readonly patience: Patience
}

function MicTelemetry({ open, elapsedMs, echoDiscards, patience: active }: MicTelemetryProps) {
  return (
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
