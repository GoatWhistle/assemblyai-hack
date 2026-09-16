"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import type { FieldCandidate, GateDecision, WordSpan } from "@/domain"
import { FieldCard } from "@/features/field-card"
import { GateBanner } from "@/features/gate-banner"
import { MicConsole } from "@/features/microphone/mic-console"
import { micStateFor } from "@/features/microphone/mic-state"
import type { ReadBackContext } from "@/features/read-back/read-back-machine"
import type {
  SpanSelection,
  TranscriptEntry,
} from "@/features/transcript-view/transcript-entry"
import { Button } from "@/shared/ui/primitives/button"
import { Panel } from "@/shared/ui/primitives/panel"
import { Wordmark } from "@/shared/ui/primitives/wordmark"
import { ErrorState } from "@/shared/ui/states/error-state"
import { IntakePrimer } from "../intake-primer"
import { IntakeRail } from "../intake-rail"
import { FAULT_COPY, PHASE_LABEL, type SessionFault, SessionPhase } from "../session-status"
import styles from "./styles.module.css"

export type IntakeScreenProps = {
  readonly candidates: readonly FieldCandidate[]
  readonly decisions: ReadonlyMap<string, GateDecision>
  readonly transcript: readonly TranscriptEntry[]
  readonly readBack: ReadBackContext
  readonly phase: SessionPhase
  readonly fault: SessionFault | null
  readonly echoDiscards: number
  readonly level: number
  readonly agentSpeaking: boolean
  readonly elapsedMs: number
  readonly onStart?: () => void
  readonly onStop?: () => void
}

function dotClass(phase: SessionPhase): string {
  if (phase === SessionPhase.Live) {
    return styles.dotLive ?? ""
  }
  if (phase === SessionPhase.Blocked) {
    return styles.dotFault ?? ""
  }
  if (phase === SessionPhase.Idle || phase === SessionPhase.Closed) {
    return ""
  }
  return styles.dotBusy ?? ""
}

export function IntakeScreen({
  candidates,
  decisions,
  transcript,
  readBack,
  phase,
  fault,
  echoDiscards,
  level,
  agentSpeaking,
  elapsedMs,
  onStart,
  onStop,
}: IntakeScreenProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    candidates[0]?.candidateId ?? null,
  )
  const selected = useMemo(
    () => candidates.find((entry) => entry.candidateId === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId],
  )
  const [selection, setSelection] = useState<SpanSelection>(null)

  const selectCandidate = useCallback((candidate: FieldCandidate) => {
    setSelectedCandidateId(candidate.candidateId)
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
        setSelectedCandidateId(owner.candidateId)
      }
    },
    [candidates],
  )

  const latestDecision =
    selected === null ? null : (decisions.get(selected.candidateId) ?? null)

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={styles.brand}>
          <p className={styles.brandName}>
            <Wordmark />
            Readback
          </p>
          <p className={styles.brandClaim}>
            Prescription intake that proves it did not mishear.
          </p>
        </div>
        <span className={styles.phase}>
          <span className={[styles.dot, dotClass(phase)].join(" ")} aria-hidden="true" />
          {PHASE_LABEL[phase]}
        </span>
      </header>

      <MicConsole
        state={micStateFor(phase, agentSpeaking, fault)}
        level={level}
        elapsedMs={elapsedMs}
        echoDiscards={echoDiscards}
        onStart={onStart}
        onStop={onStop}
      />

      <div className={styles.shell}>
        <div className={styles.main}>
          {fault === null ? null : (
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
                    <Link href="/demo">
                      <Button tone="quiet">Open the recorded demonstration</Button>
                    </Link>
                  </>
                }
              />
            </Panel>
          )}

          {candidates.length === 0 ? null : <GateBanner decision={latestDecision} />}

          <div className={styles.cards}>
            {candidates.length === 0 ? (
              <IntakePrimer />
            ) : (
              candidates.map((candidate) => (
                <FieldCard
                  key={candidate.candidateId}
                  candidate={candidate}
                  decision={decisions.get(candidate.candidateId) ?? null}
                  selectedWordStartMs={selection?.startMs ?? null}
                  onSelectWord={selectWord}
                />
              ))
            )}
          </div>
        </div>

        <IntakeRail
          candidates={candidates}
          selectedCandidateId={selectedCandidateId}
          transcript={transcript}
          selection={selection}
          readBack={readBack}
          echoDiscards={echoDiscards}
          onSelectCandidate={selectCandidate}
          onSelectWord={selectWord}
        />
      </div>
    </div>
  )
}
