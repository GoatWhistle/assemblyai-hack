"use client"

import type { ReactNode } from "react"
import type { FieldCandidate, GateDecision } from "@/domain"
import type { ListenHandler } from "@/features/field-card/said-recorded"
import type { LiveOrderSnapshot } from "@/features/order-summary/live-snapshot"
import type { FastPath } from "@/features/read-back/fast-path"
import type { ReadBackContext } from "@/features/read-back/read-back-machine"
import type { TranscriptEntry } from "@/features/transcript-view/transcript-entry"
import type { Patience } from "@/realtime/patience"
import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import { useInCall } from "../in-call-loader"
import { PhaseDot } from "../phase-dot"
import type { FaultDetail } from "../session-options"
import { type SessionFault, SessionPhase } from "../session-status"
import type { Solicited } from "../solicited-field"
import { CallStage } from "./call-stage"
import { CALL_MAIN_ID } from "./landmarks"
import styles from "./styles.module.css"
import { Thesis } from "./thesis"

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

export function IntakeScreen({
  candidates,
  decisions,
  transcript,
  readBack,
  fastPath,
  phase,
  fault,
  faultDetail = null,
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

  return (
    <div className={styles.page}>
      <SiteHeader current="call" status={<PhaseDot phase={phase} fault={fault} />} />

      <main id={CALL_MAIN_ID} tabIndex={-1} className={styles.main}>
        <Thesis started={started} />

        <CallStage
          phase={phase}
          fault={fault}
          faultDetail={faultDetail}
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

        {alert === null ? null : (
          <p className={styles.alert} role="alert">
            {alert}
          </p>
        )}

        {started && inCall !== null ? (
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
        ) : null}

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
    </div>
  )
}
