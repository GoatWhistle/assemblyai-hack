import type { FieldCandidate, GateDecision, WordSpan } from "@/domain"
import { FieldCard } from "@/features/field-card"
import type { ListenHandler } from "@/features/field-card/said-recorded"
import type { LiveOrderSnapshot } from "@/features/order-summary/live-snapshot"
import styles from "./styles.module.css"

export type FieldCardsProps = {
  readonly candidates: readonly FieldCandidate[]
  readonly decisions: ReadonlyMap<string, GateDecision>
  readonly snapshot: LiveOrderSnapshot | null
  readonly selectedWordStartMs: number | null
  readonly onSelectWord: (word: WordSpan) => void
  readonly onListen?: ListenHandler | undefined
}

export function FieldCards({
  candidates,
  decisions,
  snapshot,
  selectedWordStartMs,
  onSelectWord,
  onListen,
}: FieldCardsProps) {
  const awaiting = snapshot?.awaitingConfirmation ?? null
  return (
    <div className={styles.cards}>
      {candidates.map((candidate) => (
        <FieldCard
          key={candidate.candidateId}
          candidate={candidate}
          decision={decisions.get(candidate.candidateId) ?? null}
          siblings={candidates}
          decisions={decisions}
          selectedWordStartMs={selectedWordStartMs}
          onSelectWord={onSelectWord}
          evidence={
            snapshot?.confirmations.find(
              (entry) => entry.candidateId === candidate.candidateId,
            ) ?? null
          }
          awaitingSinceMs={
            awaiting !== null && awaiting.candidateId === candidate.candidateId
              ? awaiting.sinceMs
              : null
          }
          {...(onListen === undefined ? {} : { onListen })}
        />
      ))}
    </div>
  )
}
