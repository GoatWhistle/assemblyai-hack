import { MicConsole } from "@/features/microphone/mic-console"
import { MicState, micStateFor } from "@/features/microphone/mic-state"
import type { ReadBackState } from "@/features/read-back/read-back-machine"
import { WaitingIndicator } from "@/features/waiting/waiting-indicator"
import type { Patience } from "@/realtime/patience"
import { Swap } from "@/shared/ui/motion/swap"
import { FIELD_SPOKEN } from "../../field-language"
import type { FaultDetail } from "../../session-options"
import { isRestartable, type SessionFault, SessionPhase } from "../../session-status"
import type { Solicited } from "../../solicited-field"
import { BudgetPaused, FaultPanel } from "../fault-panel"
import styles from "./styles.module.css"

function noticeFor(
  aside: boolean,
  paused: FaultDetail | null,
  fault: SessionFault | null,
  faultDetail: FaultDetail | null,
  onStart: (() => void) | undefined,
) {
  if (aside) {
    return undefined
  }
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
  readonly noticesAside?: boolean
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
  noticesAside = false,
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
  const waiting = !(idle || blocked || mic === MicState.Opening)
  const trailing = blocked || noticesAside ? null : fault
  const next = solicited?.field == null ? null : FIELD_SPOKEN[solicited.field]
  return (
    <div className={styles.column}>
      <MicConsole
        state={mic}
        level={level}
        elapsedMs={elapsedMs}
        echoDiscards={echoDiscards}
        patience={patience}
        notice={noticeFor(
          noticesAside,
          paused ? budgetPaused : null,
          blocked ? fault : null,
          faultDetail,
          onStart,
        )}
        speaks={!(noticesAside && (paused || blocked))}
        available={!paused}
        onStart={onStart}
        onStop={onStop}
        onFinishAnswer={onFinishAnswer}
      />
      <Swap swapKey={waiting ? "waiting" : "none"} className={styles.waiting}>
        {waiting ? (
          <WaitingIndicator
            signals={{ phase, agentSpeaking, turnInFlight, readBackState }}
            next={next}
          />
        ) : null}
      </Swap>
      <Swap swapKey={trailing === null ? "none" : trailing} className={styles.trailing}>
        {trailing === null ? null : (
          <FaultPanel fault={trailing} faultDetail={faultDetail} canRestart={false} />
        )}
      </Swap>
    </div>
  )
}
