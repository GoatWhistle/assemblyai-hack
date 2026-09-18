"use client"

import { useCallback, useMemo, useState } from "react"
import type { FieldCandidate, GateDecision, WordSpan } from "@/domain"
import { estimateFromElapsed } from "@/features/cost/published-rate"
import { RateEstimate } from "@/features/cost/rate-estimate"
import { FieldCard } from "@/features/field-card"
import { GateBanner } from "@/features/gate-banner"
import { RefusalCounter } from "@/features/gate-ledger/refusal-counter"
import { type RefusalTally, tallyRefusals } from "@/features/gate-ledger/refusal-tally"
import { RejectedTable } from "@/features/gate-ledger/rejected-table"
import { MicConsole } from "@/features/microphone/mic-console"
import { micStateFor } from "@/features/microphone/mic-state"
import type { FastPath } from "@/features/read-back/fast-path"
import type { ReadBackContext } from "@/features/read-back/read-back-machine"
import type {
  SpanSelection,
  TranscriptEntry,
} from "@/features/transcript-view/transcript-entry"
import { WaitingIndicator } from "@/features/waiting/waiting-indicator"
import type { Patience } from "@/realtime/patience"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Button } from "@/shared/ui/primitives/button"
import { Panel } from "@/shared/ui/primitives/panel"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import { ErrorState } from "@/shared/ui/states/error-state"
import { AutoDegrade } from "../auto-degrade"
import { IntakeRail } from "../intake-rail"
import { PhaseDot } from "../phase-dot"
import { FAULT_COPY, type SessionFault, SessionPhase } from "../session-status"
import styles from "./styles.module.css"

export type IntakeScreenProps = {
  readonly candidates: readonly FieldCandidate[]
  readonly decisions: ReadonlyMap<string, GateDecision>
  readonly transcript: readonly TranscriptEntry[]
  readonly readBack: ReadBackContext
  readonly fastPath?: FastPath
  readonly phase: SessionPhase
  readonly fault: SessionFault | null
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
  const [pinnedCandidateId, setPinnedCandidateId] = useState<string | null>(null)
  const selected = useMemo(() => {
    const pinned = candidates.find((entry) => entry.candidateId === pinnedCandidateId)
    return pinned ?? candidates[candidates.length - 1] ?? null
  }, [candidates, pinnedCandidateId])
  const selectedCandidateId = selected?.candidateId ?? null
  const [selection, setSelection] = useState<SpanSelection>(null)

  const selectCandidate = useCallback((candidate: FieldCandidate) => {
    setPinnedCandidateId(candidate.candidateId)
    setSelection({
      startMs: candidate.provenance.startMs,
      endMs: candidate.provenance.endMs,
    })
  }, [])

  const selectWord = useCallback(
    (word: WordSpan) => {
      setSelection({ startMs: word.startMs, endMs: word.endMs })
      const owner = candidates.find((candidate) =>
        candidate.provenance.words.some((entry) => entry.startMs === word.startMs),
      )
      if (owner !== undefined) {
        setPinnedCandidateId(owner.candidateId)
      }
    },
    [candidates],
  )

  const shownDecision = selected === null ? null : (decisions.get(selected.candidateId) ?? null)

  const tally: RefusalTally = useMemo(
    () => tallyRefusals(decisionHistory ?? []),
    [decisionHistory],
  )

  const estimate = useMemo(() => estimateFromElapsed(elapsedMs), [elapsedMs])

  const started = candidates.length > 0 || transcript.length > 0
  const idle = phase === SessionPhase.Idle || phase === SessionPhase.Closed

  return (
    <div className={styles.page}>
      <SiteHeader current="intake" status={<PhaseDot phase={phase} />} />

      {started ? (
        <h1 className="visually-hidden">
          Readback: prescription intake that proves it did not mishear
        </h1>
      ) : (
        <div className={styles.thesis}>
          <h1 className={styles.thesisTitle}>
            Prescription intake that proves it did not mishear
          </h1>
          <p className={styles.thesisBody}>
            High confidence does not protect against two medicines that sound alike. A name on a
            regulator-published look-alike list is asked again even when the recognizer is
            certain.
          </p>
        </div>
      )}

      <div className={started || fault !== null ? undefined : styles.stage}>
        {idle ? null : (
          <div className={styles.waiting}>
            <WaitingIndicator
              signals={{
                phase,
                agentSpeaking,
                turnInFlight,
                readBackState: readBack.state,
              }}
            />
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

        {started || fault !== null || !idle ? null : (
          <section className={styles.prompt}>
            <p className={styles.promptBody}>
              Say the patient, the drug, the strength and the sig. Each value is read back to
              you before it is written, and anything that cannot be proved is asked again.
            </p>
            <div className={styles.promptActions}>
              <ActionLink href="/demo" tone="primary" size="large">
                Run the recorded session
              </ActionLink>
              <ActionLink href="/how-it-works" size="large">
                How the check works
              </ActionLink>
            </div>
            <p className={styles.promptAside}>
              The recorded session needs no microphone and no second person, and it runs the
              same gate over socket traffic captured from a live call. It is labelled as a
              replay throughout, and it is the shortest way to see the product refuse a value.
            </p>
          </section>
        )}
      </div>

      {fault === null ? null : (
        <div className={styles.fault}>
          <Panel padding="none">
            <ErrorState
              title={FAULT_COPY[fault].title}
              body={
                <>
                  <p>{FAULT_COPY[fault].body}</p>
                  <p>{FAULT_COPY[fault].remedy}</p>
                </>
              }
              code={fault}
              actions={
                <>
                  <Button onClick={onStart}>Try again</Button>
                  <ActionLink href="/demo">Watch the recording instead</ActionLink>
                </>
              }
            />
          </Panel>
          <AutoDegrade key={fault ?? "none"} fault={fault} />
        </div>
      )}

      {started ? (
        <div className={styles.shell}>
          <div className={styles.main}>
            {candidates.length === 0 ? null : <GateBanner decision={shownDecision} />}
            <RefusalCounter tally={tally} turnsHeld={turnsHeld} />
            <RateEstimate estimate={estimate} />
            <RejectedTable decisionHistory={decisionHistory ?? []} />
            <div className={styles.cards}>
              {candidates.map((candidate) => (
                <FieldCard
                  key={candidate.candidateId}
                  candidate={candidate}
                  decision={decisions.get(candidate.candidateId) ?? null}
                  siblings={candidates}
                  selectedWordStartMs={selection?.startMs ?? null}
                  onSelectWord={selectWord}
                />
              ))}
            </div>
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

      <div className={styles.legal}>
        <Disclaimer />
      </div>
    </div>
  )
}
