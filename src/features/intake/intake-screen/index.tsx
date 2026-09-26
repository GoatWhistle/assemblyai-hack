"use client"

import { type ReactNode, useMemo } from "react"
import type { FieldCandidate, GateDecision } from "@/domain"
import { estimateFromElapsed } from "@/features/cost/published-rate"
import { RateEstimate } from "@/features/cost/rate-estimate"
import type { ListenHandler } from "@/features/field-card/said-recorded"
import { GateBanner } from "@/features/gate-banner"
import { RefusalCounter } from "@/features/gate-ledger/refusal-counter"
import { type RefusalTally, tallyRefusals } from "@/features/gate-ledger/refusal-tally"
import { RejectedTable } from "@/features/gate-ledger/rejected-table"
import type { LiveOrderSnapshot } from "@/features/order-summary/live-snapshot"
import type { FastPath } from "@/features/read-back/fast-path"
import type { ReadBackContext } from "@/features/read-back/read-back-machine"
import type { TranscriptEntry } from "@/features/transcript-view/transcript-entry"
import type { Patience } from "@/realtime/patience"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import { IntakeRail } from "../intake-rail"
import { PhaseDot } from "../phase-dot"
import type { FaultDetail } from "../session-options"
import type { SessionFault, SessionPhase } from "../session-status"
import { useCandidateSelection } from "../use-candidate-selection"
import { CallStage } from "./call-stage"
import { FaultPanel } from "./fault-panel"
import { FieldCards } from "./field-cards"
import styles from "./styles.module.css"
import { Thesis } from "./thesis"

export const LEGAL_SUMMARY =
  "A technology demonstration, not a medical device. Use made-up details, never a real patient's."

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
  echoDiscards,
  level,
  agentSpeaking,
  elapsedMs,
  patience,
  onStart,
  onStop,
  onFinishAnswer,
}: IntakeScreenProps) {
  const { selected, selection, selectCandidate, selectWord } = useCandidateSelection(
    candidates,
    onListen,
  )
  const selectedCandidateId = selected?.candidateId ?? null

  const shownDecision = selected === null ? null : (decisions.get(selected.candidateId) ?? null)

  const tally: RefusalTally = useMemo(
    () => tallyRefusals(decisionHistory ?? []),
    [decisionHistory],
  )

  const estimate = useMemo(() => estimateFromElapsed(elapsedMs), [elapsedMs])

  const started = candidates.length > 0 || transcript.length > 0

  return (
    <div className={styles.page}>
      <SiteHeader current="call" status={<PhaseDot phase={phase} />} />

      <Thesis started={started} />

      <CallStage
        phase={phase}
        fault={fault}
        started={started}
        agentSpeaking={agentSpeaking}
        turnInFlight={turnInFlight}
        readBackState={readBack.state}
        level={level}
        elapsedMs={elapsedMs}
        echoDiscards={echoDiscards}
        patience={patience}
        onStart={onStart}
        onStop={onStop}
        onFinishAnswer={onFinishAnswer}
      />

      {fault === null ? null : (
        <FaultPanel fault={fault} faultDetail={faultDetail} onStart={onStart} />
      )}

      {alert === null ? null : (
        <p className={styles.alert} role="alert">
          {alert}
        </p>
      )}

      {started ? (
        <div className={styles.shell}>
          <div className={styles.main}>
            {candidates.length === 0 ? null : (
              <GateBanner decision={shownDecision} candidate={selected} />
            )}
            {summary}
            <RefusalCounter tally={tally} turnsHeld={turnsHeld} />
            <RateEstimate estimate={estimate} />
            <RejectedTable decisionHistory={decisionHistory ?? []} />
            <FieldCards
              candidates={candidates}
              decisions={decisions}
              snapshot={snapshot}
              selectedWordStartMs={selection?.startMs ?? null}
              onSelectWord={selectWord}
              onListen={onListen}
            />
          </div>

          <IntakeRail
            candidates={candidates}
            selectedCandidateId={selectedCandidateId}
            transcript={transcript}
            selection={selection}
            readBack={readBack}
            {...(fastPath === undefined ? {} : { fastPath })}
            echoDiscards={echoDiscards}
            onSelectCandidate={selectCandidate}
            onSelectWord={selectWord}
          />
        </div>
      ) : null}

      {telemetry === undefined ? null : (
        <details className={styles.technical}>
          <summary className={styles.summary}>
            <span className={styles.summaryText}>
              <span className={styles.summaryTitle}>Technical details</span>
              <span className={styles.summaryHint}>
                Sockets, recognizer model, latency, decision log and raw frames
              </span>
            </span>
          </summary>
          <div className={styles.telemetry}>{telemetry}</div>
        </details>
      )}

      <details className={styles.legal}>
        <summary className={styles.summary}>
          <span className={styles.summaryText}>
            <span className={styles.summaryTitle}>{LEGAL_SUMMARY}</span>
            <span className={styles.summaryHint}>Read the full notice</span>
          </span>
        </summary>
        <Disclaimer />
      </details>
    </div>
  )
}
