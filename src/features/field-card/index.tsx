"use client"

import type { CSSProperties } from "react"
import {
  type ConfirmationEvidence,
  type FieldCandidate,
  type GateDecision,
  policyFor,
  type WordSpan,
} from "@/domain"
import { ConfirmationReceipt } from "@/features/confirmation/confirmation-receipt"
import { Certainty } from "@/shared/ui/data-display/certainty"
import { VerdictBlock } from "@/shared/ui/data-display/verdict-block"
import { TRACE_CAP, WordSpanStrip } from "@/shared/ui/data-display/word-span-strip"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import { describeReason, SEVERITY_STATUS } from "../gate-banner/reason-language"
import { CRITICALITY_LABEL, FIELD_LABEL, FIELD_PROOF_NOTE } from "../intake/field-language"
import { AnswerWait } from "./answer-wait"
import { FieldHistory } from "./field-history"
import {
  confidenceRankNote,
  type FieldStance,
  isConfidenceOverruled,
  nameAnswerState,
  overruledNote,
  STANCE_LABEL,
  STANCE_MARK,
  STANCE_STATUS,
  stanceOf,
  type ValueMark,
} from "./field-status"
import { LasaOverride } from "./lasa-override"
import { type PriorAttempt, priorAttemptOf, valueChanged } from "./prior-attempt"
import { type ListenHandler, SaidRecorded } from "./said-recorded"
import { sourceBadges } from "./source-badges"
import styles from "./styles.module.css"
import { ValueChange } from "./value-change"

const CARD_CLASS: Record<string, string> = {
  lasa: styles.lasaCard ?? "",
  escalated: styles.escalatedCard ?? "",
  refused: styles.refusedCard ?? "",
  accepted: styles.acceptedCard ?? "",
  confirmed: styles.acceptedCard ?? "",
}

const MARK_CLASS: Readonly<Record<string, string>> = {
  written: styles.written ?? "",
  heldLasa: `${styles.held ?? ""} ${styles.heldLasa ?? ""}`,
  heldAsking: `${styles.held ?? ""} ${styles.heldAsking ?? ""}`,
  heldRefused: styles.held ?? "",
}

function valueClass(mark: ValueMark | null, pending: boolean): string {
  return [
    styles.value,
    mark === null ? "" : MARK_CLASS[mark],
    pending ? styles.valuePending : "",
  ]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
}

function heardLine(rawValue: string, corrected: PriorAttempt | null): string {
  const heard = `heard as "${rawValue}"`
  return corrected === null
    ? heard
    : `${heard}, correcting attempt ${corrected.attempt}, which was heard as "${corrected.rawValue}"`
}

export type FieldCardProps = {
  readonly candidate: FieldCandidate
  readonly decision: GateDecision | null
  readonly siblings?: readonly FieldCandidate[]
  readonly selectedWordStartMs?: number | null
  readonly onSelectWord?: (word: WordSpan) => void
  readonly evidence?: ConfirmationEvidence | null
  readonly awaitingSinceMs?: number | null
  readonly decisions?: ReadonlyMap<string, GateDecision>
  readonly onListen?: ListenHandler
  readonly explainedBeside?: boolean
}

const REPEATS_STANCE: Readonly<Record<FieldStance, readonly string[]>> = Object.freeze({
  proposed: [],
  asking: [],
  refused: [],
  lasa: ["lasa"],
  accepted: [],
  confirmed: ["aloud"],
  escalated: [],
  aborted: [],
})

function DecisionNote({ decision }: { readonly decision: GateDecision | null }) {
  if (decision === null) {
    return null
  }
  const reason = describeReason(decision.reasonCode)
  return (
    <div className={styles.decision}>
      <div className={styles.decisionHead}>
        <StatusChip status={SEVERITY_STATUS[reason.severity]} code>
          {decision.reasonCode}
        </StatusChip>
        <span className={styles.columnLabel}>{reason.headline}</span>
      </div>
      <p className={styles.decisionText}>{reason.because}</p>
    </div>
  )
}

export function FieldCard({
  candidate,
  decision,
  siblings = [],
  selectedWordStartMs = null,
  onSelectWord,
  evidence = null,
  awaitingSinceMs = null,
  decisions,
  onListen,
  explainedBeside = false,
}: FieldCardProps) {
  const policy = policyFor(candidate.field)
  const stance = stanceOf(candidate, decision, evidence)
  const overruled = isConfidenceOverruled(decision, candidate)
  const minConfidence = candidate.provenance.minConfidence
  const aboveThreshold = minConfidence >= policy.autoAcceptThreshold
  const mark = STANCE_MARK[stance]
  const classes = [styles.card, CARD_CLASS[stance] ?? ""]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  const displayValue =
    candidate.normalizedValue === null ? "no standard form" : String(candidate.normalizedValue)
  const prior = priorAttemptOf(candidate, siblings)
  const corrected =
    stance === "confirmed" && prior !== null && valueChanged(prior, candidate) ? prior : null

  return (
    <article
      className={classes}
      aria-label={`${FIELD_LABEL[candidate.field]} field card`}
      data-mark={mark ?? undefined}
      style={
        {
          "--trace-words": Math.min(candidate.provenance.words.length, TRACE_CAP),
        } as CSSProperties
      }
    >
      <header className={styles.head}>
        <div className={styles.identity}>
          <p className={styles.name}>
            <span>{FIELD_LABEL[candidate.field]}</span>
            <StatusChip status="tag">{CRITICALITY_LABEL[policy.criticality]}</StatusChip>
            <span>attempt {candidate.attempt}</span>
          </p>
          <p className={valueClass(mark, candidate.normalizedValue === null)}>{displayValue}</p>
          <p className={styles.raw}>{heardLine(candidate.rawValue, corrected)}</p>
        </div>
        <div className={styles.statuses}>
          <StatusChip status={STANCE_STATUS[stance]}>{STANCE_LABEL[stance]}</StatusChip>
          {sourceBadges(candidate, evidence)
            .filter((entry) => !REPEATS_STANCE[stance].includes(entry.id))
            .map((entry) => (
              <StatusChip key={entry.id} status={entry.status}>
                {entry.label}
              </StatusChip>
            ))}
        </div>
      </header>

      <SaidRecorded candidate={candidate} {...(onListen === undefined ? {} : { onListen })} />
      {awaitingSinceMs === null ? null : <AnswerWait sinceMs={awaitingSinceMs} />}
      {evidence === null ? null : (
        <section className={styles.receipt} aria-label="Read-back and answer">
          <ConfirmationReceipt evidence={evidence} />
        </section>
      )}

      {decision !== null && overruled && candidate.lasa.hit ? (
        <LasaOverride
          lasa={candidate.lasa}
          minConfidence={minConfidence}
          threshold={policy.autoAcceptThreshold}
          nameState={nameAnswerState(evidence)}
          compact={explainedBeside}
        />
      ) : null}

      {prior === null ? null : (
        <ValueChange
          prior={prior}
          current={displayValue}
          currentRaw={candidate.rawValue}
          changed={valueChanged(prior, candidate)}
          written={stance === "confirmed" || stance === "accepted"}
        />
      )}

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
            overruledBy={overruled ? overruledNote(decision) : undefined}
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

      <FieldHistory
        candidate={candidate}
        siblings={siblings}
        {...(decisions === undefined ? {} : { decisions })}
      />

      <DecisionNote decision={explainedBeside ? null : decision} />
    </article>
  )
}
