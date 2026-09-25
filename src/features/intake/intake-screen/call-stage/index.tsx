import { MicConsole } from "@/features/microphone/mic-console"
import { micStateFor } from "@/features/microphone/mic-state"
import type { ReadBackState } from "@/features/read-back/read-back-machine"
import { WaitingIndicator } from "@/features/waiting/waiting-indicator"
import type { Patience } from "@/realtime/patience"
import { isRestartable, type SessionFault, type SessionPhase } from "../../session-status"
import { IntakePrompt } from "../intake-prompt"
import styles from "./styles.module.css"

export type CallStageProps = {
  readonly phase: SessionPhase
  readonly fault: SessionFault | null
  readonly started: boolean
  readonly agentSpeaking: boolean
  readonly turnInFlight: boolean
  readonly readBackState: ReadBackState
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
  started,
  agentSpeaking,
  turnInFlight,
  readBackState,
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
  return (
    <div className={resting ? styles.stage : undefined}>
      {idle ? null : (
        <div className={styles.waiting}>
          <WaitingIndicator signals={{ phase, agentSpeaking, turnInFlight, readBackState }} />
        </div>
      )}
      <MicConsole
        state={micStateFor(phase, agentSpeaking, fault)}
        level={level}
        elapsedMs={elapsedMs}
        echoDiscards={echoDiscards}
        patience={patience}
        onStart={onStart}
        onStop={onStop}
        onFinishAnswer={onFinishAnswer}
      />
      {resting && idle ? <IntakePrompt /> : null}
    </div>
  )
}
