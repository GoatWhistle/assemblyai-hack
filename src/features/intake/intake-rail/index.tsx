"use client"

import type { FieldCandidate, WordSpan } from "@/domain"
import type { FastPath } from "@/features/read-back/fast-path"
import type { ReadBackContext } from "@/features/read-back/read-back-machine"
import { ReadBackPanel } from "@/features/read-back/read-back-panel"
import { TranscriptView } from "@/features/transcript-view"
import type {
  SpanSelection,
  TranscriptEntry,
} from "@/features/transcript-view/transcript-entry"
import { Chip } from "@/shared/ui/primitives/chip"
import { Panel } from "@/shared/ui/primitives/panel"
import { FIELD_LABEL } from "../field-language"
import styles from "./styles.module.css"

export type IntakeRailProps = {
  readonly candidates: readonly FieldCandidate[]
  readonly selectedCandidateId: string | null
  readonly transcript: readonly TranscriptEntry[]
  readonly selection: SpanSelection
  readonly readBack: ReadBackContext
  readonly fastPath?: FastPath
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
  fastPath,
  echoDiscards,
  onSelectCandidate,
  onSelectWord,
}: IntakeRailProps) {
  return (
    <aside className={styles.rail}>
      <Panel
        title="The order so far"
        note={
          candidates.length === 0 ? "nothing proposed yet" : `${candidates.length} proposed`
        }
        padding="tight"
      >
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

      <Panel title="Reading it back" padding="none">
        <ReadBackPanel context={readBack} {...(fastPath === undefined ? {} : { fastPath })} />
      </Panel>

      <Panel
        title="What was said"
        note={
          echoDiscards > 0
            ? `${echoDiscards} turns of the agent hearing itself were dropped`
            : undefined
        }
        padding="none"
      >
        <TranscriptView
          entries={transcript}
          selection={selection}
          onSelectWord={onSelectWord}
        />
      </Panel>
    </aside>
  )
}
