"use client"

import { type FieldCandidate, type GateDecision, policyFor, type WordSpan } from "@/domain"
import { Certainty } from "@/shared/ui/data-display/certainty"
import { VerdictBlock } from "@/shared/ui/data-display/verdict-block"
import { WordSpanStrip } from "@/shared/ui/data-display/word-span-strip"
import { Chip } from "@/shared/ui/primitives/chip"
import { describeReason } from "../gate-banner/reason-language"
import { CRITICALITY_LABEL, FIELD_LABEL, FIELD_PROOF_NOTE } from "../intake/field-language"
import {
  confidenceRankNote,
  isConfidenceOverruled,
  STANCE_CHIP,
  STANCE_LABEL,
  stanceOf,
} from "./field-status"
import { LasaOverride } from "./lasa-override"
import styles from "./styles.module.css"

const CARD_CLASS: Record<string, string> = {
  lasa: styles.lasaCard ?? "",
  escalated: styles.escalatedCard ?? "",
  accepted: styles.acceptedCard ?? "",
}

export type FieldCardProps = {
  readonly candidate: FieldCandidate
  readonly decision: GateDecision | null
  readonly selectedWordStartMs?: number | null
  readonly onSelectWord?: (word: WordSpan) => void
}

export function FieldCard({
  candidate,
  decision,
  selectedWordStartMs = null,
  onSelectWord,
}: FieldCardProps) {
  const policy = policyFor(candidate.field)
  const stance = stanceOf(candidate, decision)
  const overruled = isConfidenceOverruled(decision)
  const minConfidence = candidate.provenance.minConfidence
  const aboveThreshold = minConfidence >= policy.autoAcceptThreshold
  const classes = [styles.card, CARD_CLASS[stance] ?? ""]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  const displayValue =
    candidate.normalizedValue === null ? "no standard form" : String(candidate.normalizedValue)

  return (
    <article className={classes} aria-label={`${FIELD_LABEL[candidate.field]} field card`}>
      <header className={styles.head}>
        <div className={styles.identity}>
          <p className={styles.name}>
            <span>{FIELD_LABEL[candidate.field]}</span>
            <Chip tone="plain">{CRITICALITY_LABEL[policy.criticality]}</Chip>
            <span>attempt {candidate.attempt}</span>
          </p>
          <p
            className={[
              styles.value,
              candidate.normalizedValue === null ? styles.valuePending : "",
            ]
              .filter((value) => value !== undefined && value !== "")
              .join(" ")}
          >
            {displayValue}
          </p>
          <p className={styles.raw}>heard as &ldquo;{candidate.rawValue}&rdquo;</p>
        </div>
        <div className={styles.statuses}>
          <Chip tone={STANCE_CHIP[stance]}>{STANCE_LABEL[stance]}</Chip>
        </div>
      </header>

      {overruled && candidate.lasa.hit ? (
        <LasaOverride
          lasa={candidate.lasa}
          minConfidence={minConfidence}
          threshold={policy.autoAcceptThreshold}
        />
      ) : null}

      <div className={styles.proof}>
        <div className={styles.proofPrimary}>
          <p className={styles.columnLabel}>What proves this value</p>
          <VerdictBlock verdict={candidate.verdict} />
          <p className={styles.columnNote}>{FIELD_PROOF_NOTE[candidate.field]}</p>
        </div>
        <div className={styles.proofSecondary}>
          <p className={styles.columnLabel}>What the recognizer claims about itself</p>
          <Certainty
            minConfidence={minConfidence}
            threshold={policy.autoAcceptThreshold}
            overruled={overruled}
            overruledBy={
              overruled
                ? "Outranked on this field by a published look-alike pair. This number is not what decides here."
                : undefined
            }
          />
        </div>
      </div>

      <p className={styles.rank}>{confidenceRankNote(stance, aboveThreshold)}</p>

      <div className={styles.provenance}>
        <div className={styles.provenanceHead}>
          <p className={styles.provenanceLabel}>The spoken words this value came from</p>
          <p className={styles.provenanceCaveat}>
            computed in the browser from the STT socket, so it is client-supplied
          </p>
        </div>
        <WordSpanStrip
          provenance={candidate.provenance}
          selectedStartMs={selectedWordStartMs}
          onSelectWord={onSelectWord}
        />
      </div>

      {decision === null ? null : (
        <div className={styles.decision}>
          <div className={styles.decisionHead}>
            <Chip tone={STANCE_CHIP[stance]} monospace>
              {decision.reasonCode}
            </Chip>
            <span className={styles.columnLabel}>
              {describeReason(decision.reasonCode).headline}
            </span>
          </div>
          <p className={styles.decisionText}>{describeReason(decision.reasonCode).because}</p>
        </div>
      )}
    </article>
  )
}
