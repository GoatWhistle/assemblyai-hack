import { MicConsole } from "@/features/microphone/mic-console"
import { MicState, micStateFor } from "@/features/microphone/mic-state"
import type { ReadBackState } from "@/features/read-back/read-back-machine"
import { WaitingIndicator } from "@/features/waiting/waiting-indicator"
import type { Patience } from "@/realtime/patience"
import { FIELD_SPOKEN } from "../../field-language"
import type { FaultDetail } from "../../session-options"
import { isRestartable, type SessionFault, type SessionPhase } from "../../session-status"
import type { Solicited } from "../../solicited-field"
import { FaultPanel } from "../fault-panel"
import { IntakePrompt } from "../intake-prompt"
import styles from "./styles.module.css"

export type CallStageProps = {
  readonly phase: SessionPhase
  readonly fault: SessionFault | null
  readonly faultDetail?: FaultDetail | null
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
  const mic = micStateFor(phase, agentSpeaking, fault)
  const blocked = mic === MicState.Blocked
  const idle = isRestartable(phase)
  const resting = !started && fault === null
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
        notice={
          blocked && fault !== null ? (
            <FaultPanel key={fault} fault={fault} faultDetail={faultDetail} onStart={onStart} />
          ) : undefined
        }
        onStart={onStart}
        onStop={onStop}
        onFinishAnswer={onFinishAnswer}
      />
      {idle || blocked ? null : (
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
      {resting && idle ? <IntakePrompt /> : null}
    </div>
  )
}
