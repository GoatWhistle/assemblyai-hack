import { MicConsole } from "@/features/microphone/mic-console"
import { MicState, micStateFor } from "@/features/microphone/mic-state"
import type { ReadBackState } from "@/features/read-back/read-back-machine"
import { WaitingIndicator } from "@/features/waiting/waiting-indicator"
import type { Patience } from "@/realtime/patience"
import { FIELD_SPOKEN } from "../../field-language"
import type { FaultDetail } from "../../session-options"
import { isRestartable, type SessionFault, SessionPhase } from "../../session-status"
import type { Solicited } from "../../solicited-field"
import { BudgetPaused, FaultPanel } from "../fault-panel"
import { IntakePrompt } from "../intake-prompt"
import styles from "./styles.module.css"

function noticeFor(
  paused: FaultDetail | null,
  fault: SessionFault | null,
  faultDetail: FaultDetail | null,
  onStart: (() => void) | undefined,
) {
  if (paused !== null) {
    return <BudgetPaused detail={paused} />
  }
  if (fault === null) {
    return undefined
  }
  return <FaultPanel key={fault} fault={fault} faultDetail={faultDetail} onStart={onStart} />
}

export type CallStageProps = {
  readonly phase: SessionPhase
  readonly fault: SessionFault | null
  readonly faultDetail?: FaultDetail | null
  readonly budgetPaused?: FaultDetail | null
  readonly started: boolean
  readonly agentSpeaking: boolean
  readonly turnInFlight: boolean
  readonly readBackState: ReadBackState
  readonly solicited?: Solicited | undefined
  readonly level: number
  readonly elapsedMs: number
  readonly echoDiscards: number
  readonly patience?: Patience | undefined
  readonly onStart?: (() => void) | undefined
  readonly onStop?: (() => void) | undefined
  readonly onFinishAnswer?: (() => void) | undefined
}

export function CallStage({
  phase,
  fault,
  faultDetail = null,
  budgetPaused = null,
  started,
  agentSpeaking,
  turnInFlight,
  readBackState,
  solicited,
  level,
  elapsedMs,
  echoDiscards,
  patience,
  onStart,
  onStop,
  onFinishAnswer,
}: CallStageProps) {
  const idle = isRestartable(phase)
  const resting = !started && fault === null
  const paused = budgetPaused !== null && resting && phase === SessionPhase.Idle
  const mic = paused ? MicState.Blocked : micStateFor(phase, agentSpeaking, fault)
  const blocked = mic === MicState.Blocked
  const next =
    solicited === undefined || solicited.field === null ? null : FIELD_SPOKEN[solicited.field]
  const classes = [styles.column, resting ? styles.stage : ""].filter((value) => value !== "")
  return (
    <div className={classes.join(" ")}>
      <MicConsole
        state={mic}
        level={level}
        elapsedMs={elapsedMs}
        echoDiscards={echoDiscards}
        patience={patience}
        notice={noticeFor(
          paused ? budgetPaused : null,
          blocked ? fault : null,
          faultDetail,
          onStart,
        )}
        available={!paused}
        onStart={onStart}
        onStop={onStop}
        onFinishAnswer={onFinishAnswer}
      />
      {idle || blocked || mic === MicState.Opening ? null : (
        <div className={styles.waiting}>
          <WaitingIndicator
            signals={{ phase, agentSpeaking, turnInFlight, readBackState }}
            next={next}
          />
        </div>
      )}
      {blocked || fault === null ? null : (
        <FaultPanel key={fault} fault={fault} faultDetail={faultDetail} canRestart={false} />
      )}
      {resting && idle && !paused ? <IntakePrompt /> : null}
    </div>
  )
}
