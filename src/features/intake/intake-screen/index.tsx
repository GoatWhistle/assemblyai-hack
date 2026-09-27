"use client"

import type { ReactNode } from "react"
import type { FieldCandidate, GateDecision } from "@/domain"
import type { ListenHandler } from "@/features/field-card/said-recorded"
import type { LiveOrderSnapshot } from "@/features/order-summary/live-snapshot"
import type { FastPath } from "@/features/read-back/fast-path"
import type { ReadBackContext } from "@/features/read-back/read-back-machine"
import type { TranscriptEntry } from "@/features/transcript-view/transcript-entry"
import type { Patience } from "@/realtime/patience"
import { PageShell } from "@/shared/ui/layout/page-shell"
import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import { useInCall } from "../in-call-loader"
import { PhaseDot } from "../phase-dot"
import type { FaultDetail } from "../session-options"
import { isRestartable, type SessionFault, SessionPhase } from "../session-status"
import type { Solicited } from "../solicited-field"
import { CallStage } from "./call-stage"
import { IntakePrompt } from "./intake-prompt"
import { CALL_MAIN_ID } from "./landmarks"
import { ProofMap } from "./proof-map"
import styles from "./styles.module.css"
import { ThesisPromise, ThesisTitle } from "./thesis"

export const LEGAL_SUMMARY =
  "A technology demonstration, not a medical device. Use made-up details, never a real patient's."

export const TECHNICAL_HINT =
  "Sockets, recognizer model, latency, cost, refusals and raw frames"

export type IntakeScreenProps = {
  readonly candidates: readonly FieldCandidate[]
  readonly decisions: ReadonlyMap<string, GateDecision>
  readonly transcript: readonly TranscriptEntry[]
  readonly readBack: ReadBackContext
  readonly fastPath?: FastPath
  readonly phase: SessionPhase
  readonly fault: SessionFault | null
  readonly faultDetail?: FaultDetail | null
  readonly budgetPaused?: FaultDetail | null
  readonly alert?: string | null
  readonly telemetry?: ReactNode
  readonly summary?: ReactNode
  readonly snapshot?: LiveOrderSnapshot | null
  readonly onListen?: ListenHandler
  readonly decisionHistory?: readonly GateDecision[]
  readonly turnsHeld?: number | null
  readonly turnInFlight?: boolean
  readonly solicited?: Solicited
  readonly echoDiscards: number
  readonly level: number
  readonly agentSpeaking: boolean
  readonly elapsedMs: number
  readonly patience?: Patience
  readonly onStart?: () => void
  readonly onStop?: () => void
  readonly onFinishAnswer?: () => void
}

function promptsFor(
  phase: SessionPhase,
  fault: SessionFault | null,
  budgetPaused: FaultDetail | null,
): boolean {
  const paused = budgetPaused !== null && phase === SessionPhase.Idle
  return fault === null && isRestartable(phase) && !paused
}

export function IntakeScreen({
  candidates,
  decisions,
  transcript,
  readBack,
  fastPath,
  phase,
  fault,
  faultDetail = null,
  budgetPaused = null,
  alert = null,
  telemetry,
  summary,
  snapshot = null,
  onListen,
  decisionHistory,
  turnsHeld = null,
  turnInFlight = false,
  solicited,
  echoDiscards,
  level,
  agentSpeaking,
  elapsedMs,
  patience,
  onStart,
  onStop,
  onFinishAnswer,
}: IntakeScreenProps) {
  const started = candidates.length > 0 || transcript.length > 0
  const inCall = useInCall(phase !== SessionPhase.Idle || started)
  const prompting = !started && promptsFor(phase, fault, budgetPaused)

  return (
    <PageShell
      current="call"
      status={<PhaseDot phase={phase} fault={fault} paused={budgetPaused !== null} />}
    >
      <main id={CALL_MAIN_ID} tabIndex={-1} className={styles.main}>
        <div className={`${styles.workspace} ${started ? styles.live : styles.resting}`}>
          {started ? (
            <ThesisTitle started />
          ) : (
            <div className={styles.titleArea}>
              <ThesisTitle started={false} />
            </div>
          )}

          <div className={styles.callArea}>
            <CallStage
              phase={phase}
              fault={fault}
              faultDetail={faultDetail}
              budgetPaused={budgetPaused}
              started={started}
              agentSpeaking={agentSpeaking}
              turnInFlight={turnInFlight}
              readBackState={readBack.state}
              solicited={solicited}
              level={level}
              elapsedMs={elapsedMs}
              echoDiscards={echoDiscards}
              patience={patience}
              onStart={onStart}
              onStop={onStop}
              onFinishAnswer={onFinishAnswer}
            />
          </div>

          {prompting ? (
            <div className={styles.promptArea}>
              <IntakePrompt />
            </div>
          ) : null}

          {alert === null ? null : (
            <p className={styles.alert} role="alert">
              {alert}
            </p>
          )}

          {started ? null : (
            <>
              <div className={styles.promiseArea}>
                <ThesisPromise />
              </div>
              <div className={styles.mapArea}>
                <ProofMap />
              </div>
            </>
          )}

          {started && inCall !== null ? (
            <div className={styles.panels}>
              <inCall.CallPanels
                candidates={candidates}
                decisions={decisions}
                transcript={transcript}
                readBack={readBack}
                fastPath={fastPath}
                summary={summary}
                snapshot={snapshot}
                echoDiscards={echoDiscards}
                onListen={onListen}
              />
            </div>
          ) : null}
        </div>

        {telemetry === undefined ? null : (
          <div className={styles.technical}>
            <Disclosure
              tone="framed"
              summary={
                <span className={styles.summary}>
                  <span>Technical details</span>
                  <span className={styles.hint}>{TECHNICAL_HINT}</span>
                </span>
              }
            >
              {telemetry}
              {started && inCall !== null ? (
                <inCall.TechnicalLedger
                  decisionHistory={decisionHistory ?? []}
                  turnsHeld={turnsHeld}
                  elapsedMs={elapsedMs}
                />
              ) : null}
            </Disclosure>
          </div>
        )}

        <div className={styles.legal}>
          <Disclosure
            summary={
              <span className={styles.summary}>
                <span>{LEGAL_SUMMARY}</span>
                <span className={styles.hint}>Read the full notice</span>
              </span>
            }
          >
            <Disclaimer />
          </Disclosure>
        </div>
      </main>
    </PageShell>
  )
}
