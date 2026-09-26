"use client"

import type { ReactNode } from "react"
import type { FieldCandidate, GateDecision } from "@/domain"
import type { ListenHandler } from "@/features/field-card/said-recorded"
import { GateBanner } from "@/features/gate-banner"
import type { LiveOrderSnapshot } from "@/features/order-summary/live-snapshot"
import type { FastPath } from "@/features/read-back/fast-path"
import type { ReadBackContext } from "@/features/read-back/read-back-machine"
import type { TranscriptEntry } from "@/features/transcript-view/transcript-entry"
import { IntakeRail } from "../../intake-rail"
import { useCandidateSelection } from "../../use-candidate-selection"
import { FieldCards } from "../field-cards"
import styles from "./styles.module.css"

export type CallPanelsProps = {
  readonly candidates: readonly FieldCandidate[]
  readonly decisions: ReadonlyMap<string, GateDecision>
  readonly transcript: readonly TranscriptEntry[]
  readonly readBack: ReadBackContext
  readonly fastPath?: FastPath | undefined
  readonly summary?: ReactNode
  readonly snapshot: LiveOrderSnapshot | null
  readonly echoDiscards: number
  readonly onListen?: ListenHandler | undefined
}

export function CallPanels({
  candidates,
  decisions,
  transcript,
  readBack,
  fastPath,
  summary,
  snapshot,
  echoDiscards,
  onListen,
}: CallPanelsProps) {
  const { selected, selection, selectCandidate, selectWord } = useCandidateSelection(
    candidates,
    onListen,
  )
  const shownDecision = selected === null ? null : (decisions.get(selected.candidateId) ?? null)
  return (
    <div className={styles.shell}>
      <div className={styles.main}>
        {candidates.length === 0 ? null : (
          <GateBanner decision={shownDecision} candidate={selected} />
        )}
        {summary}
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
        selectedCandidateId={selected?.candidateId ?? null}
        transcript={transcript}
        selection={selection}
        readBack={readBack}
        {...(fastPath === undefined ? {} : { fastPath })}
        echoDiscards={echoDiscards}
        onSelectCandidate={selectCandidate}
        onSelectWord={selectWord}
      />
    </div>
  )
}
