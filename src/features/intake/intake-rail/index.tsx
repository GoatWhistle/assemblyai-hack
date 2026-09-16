"use client"

import Link from "next/link"
import type { FieldCandidate, WordSpan } from "@/domain"
import type { ReadBackContext } from "@/features/read-back/read-back-machine"
import { ReadBackPanel } from "@/features/read-back/read-back-panel"
import { TranscriptView } from "@/features/transcript-view"
import type {
  SpanSelection,
  TranscriptEntry,
} from "@/features/transcript-view/transcript-entry"
import { Chip } from "@/shared/ui/primitives/chip"
import { Panel } from "@/shared/ui/primitives/panel"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import { FIELD_LABEL } from "../field-language"
import styles from "./styles.module.css"

export type IntakeRailProps = {
  readonly candidates: readonly FieldCandidate[]
  readonly selectedCandidateId: string | null
  readonly transcript: readonly TranscriptEntry[]
  readonly selection: SpanSelection
  readonly readBack: ReadBackContext
  readonly echoDiscards: number
  readonly onSelectCandidate: (candidate: FieldCandidate) => void
  readonly onSelectWord: (word: WordSpan, entry: TranscriptEntry) => void
}

export function IntakeRail({
  candidates,
  selectedCandidateId,
  transcript,
  selection,
  readBack,
  echoDiscards,
  onSelectCandidate,
  onSelectWord,
}: IntakeRailProps) {
  return (
    <aside className={styles.rail}>
      <Panel title="Order" note={`${candidates.length} proposed`} padding="tight">
        <div className={styles.progressList}>
          {candidates.length === 0 ? (
            <p className={styles.disclaimerBody}>Nothing proposed yet.</p>
          ) : (
            candidates.map((candidate) => (
              <button
                key={candidate.candidateId}
                type="button"
                className={[
                  styles.progressRow,
                  candidate.candidateId === selectedCandidateId ? styles.progressRowActive : "",
                ]
                  .filter((value) => value !== undefined && value !== "")
                  .join(" ")}
                onClick={() => onSelectCandidate(candidate)}
              >
                <span className={styles.progressName}>{FIELD_LABEL[candidate.field]}</span>
                <Chip tone={candidate.lasa.hit ? "lasa" : "plain"}>
                  {candidate.lasa.hit ? "pair" : `att ${candidate.attempt}`}
                </Chip>
              </button>
            ))
          )}
        </div>
      </Panel>

      <Panel title="Read-back" padding="none">
        <ReadBackPanel context={readBack} />
      </Panel>

      <Panel title="Transcript" note={`${echoDiscards} echo turns discarded`} padding="none">
        <TranscriptView
          entries={transcript}
          selection={selection}
          onSelectWord={onSelectWord}
        />
      </Panel>

      <Disclaimer />

      <nav className={styles.nav} aria-label="Other views">
        <Link href="/demo">Recorded demonstration</Link>
        <Link href="/metrics">Measurements</Link>
      </nav>
    </aside>
  )
}
