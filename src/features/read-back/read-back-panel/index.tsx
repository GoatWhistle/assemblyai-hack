import { FIELD_LABEL } from "@/features/intake/field-language"
import { EmptyState } from "@/shared/ui/states/empty-state"
import { type FastPath, FastPathAction, NO_FAST_PATH } from "../fast-path"
import {
  READ_BACK_STATE_LABEL,
  type ReadBackContext,
  ReadBackState,
} from "../read-back-machine"
import { spellTokens } from "../spell-out"
import styles from "./styles.module.css"

const TRACK: readonly ReadBackState[] = [
  ReadBackState.AwaitingConfirmation,
  ReadBackState.Matched,
  ReadBackState.SpellOut,
  ReadBackState.Escalated,
]

const TRACK_LABEL: Readonly<Record<ReadBackState, string>> = Object.freeze({
  idle: "idle",
  awaiting_confirmation: "awaiting",
  matched: "matched",
  failed: "failed",
  spell_out: "spell-out",
  escalated: "escalated",
  cancelled: "cancelled",
})

function stepClass(step: ReadBackState, current: ReadBackState): string {
  if (step === current) {
    if (current === ReadBackState.Escalated) {
      return styles.stepFailed ?? ""
    }
    if (current === ReadBackState.Matched) {
      return styles.stepDone ?? ""
    }
    return styles.stepCurrent ?? ""
  }
  if (step === ReadBackState.AwaitingConfirmation && current !== ReadBackState.Idle) {
    return styles.stepDone ?? ""
  }
  return ""
}

export type ReadBackPanelProps = {
  readonly context: ReadBackContext
  readonly fastPath?: FastPath
}

export function ReadBackPanel({ context, fastPath = NO_FAST_PATH }: ReadBackPanelProps) {
  if (context.state === ReadBackState.Idle || context.field === null) {
    return (
      <EmptyState
        glyph="?"
        title="No read-back in flight"
        body="When the gate asks for a spoken confirmation, the exchange appears here: the phrase the agent said, what the caller answered, and whether the two matched."
      />
    )
  }
  const tokens =
    context.state === ReadBackState.SpellOut
      ? spellTokens(context.expectedValue, context.spellOutStyle)
      : []
  const failed = context.state === ReadBackState.Failed
  return (
    <div className={styles.panel}>
      <ol className={styles.track}>
        {TRACK.map((step, index) => (
          <li key={step} className={`${styles.step} ${stepClass(step, context.state)}`}>
            {index > 0 ? (
              <span className={styles.arrow} aria-hidden="true">
                &rarr;
              </span>
            ) : null}
            {TRACK_LABEL[step]}
          </li>
        ))}
        {failed ? (
          <li className={[styles.step, styles.stepFailed].join(" ")}>{TRACK_LABEL.failed}</li>
        ) : null}
      </ol>

      <output className={styles.status} aria-live="polite">
        {READ_BACK_STATE_LABEL[context.state]} &mdash; {FIELD_LABEL[context.field]}
      </output>

      {fastPath.action === FastPathAction.None ? null : (
        <output
          key={`${context.field}:${context.attempts}`}
          className={styles.localNote}
          aria-live="polite"
        >
          <span className={styles.localLabel}>answered locally, no model round trip</span>
          {fastPath.label}
        </output>
      )}

      <div className={styles.exchange}>
        <div className={styles.said}>
          <p className={styles.saidWho}>The agent said</p>
          <p className={styles.saidText}>{context.utterance}</p>
        </div>
        {context.heard === null ? null : (
          <div className={styles.said}>
            <p className={styles.saidWho}>The caller answered</p>
            <p className={styles.saidText}>{context.heard}</p>
          </div>
        )}
      </div>

      {tokens.length === 0 ? null : (
        <div className={styles.spell}>
          <p className={styles.saidWho}>
            Spelled out{" "}
            {context.spellOutStyle === "nato" ? "with the NATO alphabet" : "digit by digit"}
          </p>
          <div className={styles.spellTokens}>
            {tokens.map((token, index) => (
              <span key={`${token.source}-${index}`} className={styles.token}>
                <span className={styles.tokenSource}>{token.source}</span>
                <span className={styles.tokenSpoken}>{token.spoken}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <p className={styles.attempts}>
        attempt {context.attempts} of {context.maxAttempts}
        {context.confirmationMode === null ? "" : ` · mode ${context.confirmationMode}`}
      </p>
    </div>
  )
}
