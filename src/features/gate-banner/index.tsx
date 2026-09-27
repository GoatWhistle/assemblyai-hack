import type { ReactNode } from "react"
import {
  type ConfirmationEvidence,
  type FieldCandidate,
  type GateDecision,
  ReasonCode,
} from "@/domain"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import { FIELD_LABEL } from "../intake/field-language"
import { ContrastQuestion, spokenChoice } from "./contrast-question"
import { stanceFor } from "./hypothesis-language"
import {
  ACTION_LANGUAGE,
  describeReason,
  type ReasonSeverity,
  SEVERITY_STATUS,
} from "./reason-language"
import { ReasonStance } from "./reason-stance"
import { RECOVERY_STEP } from "./recovery-language"
import { signatureOf } from "./signature"
import { SignatureLine } from "./signature-line"
import styles from "./styles.module.css"

export const CONFIRMED_HEADLINE = "Written after the caller said the name"

export type AskedEarlier = {
  readonly decision: GateDecision
  readonly candidate: FieldCandidate
  readonly atSeconds: string
}

export type ConfirmedBannerProps = {
  readonly evidence: ConfirmationEvidence
  readonly candidate: FieldCandidate
  readonly asked?: AskedEarlier | null
}

export function ConfirmedBanner({ evidence, candidate, asked = null }: ConfirmedBannerProps) {
  const value = String(candidate.normalizedValue ?? candidate.rawValue)
  const earlier = asked === null ? null : signatureOf(asked.candidate, asked.decision)
  return (
    <div
      className={`${styles.banner} ${styles.accepted}`}
      key={`confirmed:${evidence.candidateId}:${evidence.reasonCode}`}
      data-motion="fade"
    >
      <div className={styles.top}>
        <p className={styles.headline}>{CONFIRMED_HEADLINE}</p>
        <StatusChip status="written" code>
          {evidence.reasonCode}
        </StatusChip>
        <StatusChip status="tag">{FIELD_LABEL[candidate.field]}</StatusChip>
      </div>
      <p className={styles.because}>
        The caller said {value} aloud, so {value} is the value in the order. A yes would have
        written nothing: only a spoken name answers the contrastive question.
      </p>
      {asked === null || earlier === null ? null : (
        <p className={styles.history}>
          Asked at {asked.atSeconds}: RE-ASK <code>{asked.decision.reasonCode}</code>,{" "}
          {spokenChoice(earlier.candidates)}?
        </p>
      )}
    </div>
  )
}

const SEVERITY_CLASS: Record<ReasonSeverity, string> = {
  accepted: styles.accepted ?? "",
  asking: styles.asking ?? "",
  refused: styles.refused ?? "",
  lasa: styles.lasa ?? "",
  escalated: styles.escalated ?? "",
  aborted: styles.aborted ?? "",
}

export type ConfirmedField = {
  readonly evidence: ConfirmationEvidence
  readonly candidate: FieldCandidate
  readonly asked?: AskedEarlier | null
}

export type GateBannerProps = {
  readonly decision: GateDecision | null
  readonly candidate?: FieldCandidate | null
  readonly confirmed?: ConfirmedField | null
  readonly live?: boolean
}

function Region({ live, children }: { readonly live: boolean; readonly children: ReactNode }) {
  if (live) {
    return (
      <output aria-live="polite" className={styles.region}>
        {children}
      </output>
    )
  }
  return <div className={styles.region}>{children}</div>
}

export function GateBanner({
  decision,
  candidate = null,
  confirmed = null,
  live = true,
}: GateBannerProps) {
  if (confirmed !== null && confirmed.evidence.verdict === "confirmed") {
    return (
      <Region live={live}>
        <ConfirmedBanner
          evidence={confirmed.evidence}
          candidate={confirmed.candidate}
          asked={confirmed.asked ?? null}
        />
      </Region>
    )
  }
  if (decision === null) {
    return (
      <Region live={live}>
        <div className={styles.banner}>
          <p className={styles.headline}>The gate has not been asked anything yet</p>
          <p className={styles.idle}>
            Every proposed value passes through one decision function before it can enter the
            order. Its verdict, and the reason code behind it, appears here as it happens.
          </p>
        </div>
      </Region>
    )
  }
  const reason = describeReason(decision.reasonCode)
  const recovery = RECOVERY_STEP[decision.reasonCode]
  const stance = stanceFor(decision.reasonCode)
  const classes = [styles.banner, SEVERITY_CLASS[reason.severity]]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  const signature =
    candidate === null || candidate.candidateId !== decision.candidateId
      ? null
      : signatureOf(candidate, decision)
  const contrastive =
    signature !== null &&
    decision.reasonCode === ReasonCode.LasaHit &&
    signature.candidates.length >= 2
  const verdictKey = `${decision.candidateId}:${decision.reasonCode}:${decision.evidence.attempt}`
  return (
    <Region live={live}>
      <div className={classes} key={verdictKey} data-motion="fade">
        {signature === null ? null : <SignatureLine signature={signature} />}
        <div className={styles.top}>
          <p className={styles.headline}>{reason.headline}</p>
          <StatusChip status={SEVERITY_STATUS[reason.severity]} code>
            {reason.code}
          </StatusChip>
          <StatusChip status="tag">{ACTION_LANGUAGE[decision.action]}</StatusChip>
          <StatusChip status="tag">{FIELD_LABEL[decision.field]}</StatusChip>
        </div>
        <p className={styles.because}>{reason.because}</p>
        {contrastive ? <ContrastQuestion candidates={signature.candidates} /> : null}
        {stance === null ? null : <ReasonStance stance={stance} />}
        <div className={styles.utterance}>
          <p className={styles.utteranceLabel}>The phrase the gate handed the agent to say</p>
          <p className={styles.utteranceText}>{decision.agentUtterance}</p>
        </div>
        {recovery === null ? null : (
          <div className={styles.recovery}>
            <p className={styles.recoveryLabel}>
              The way forward on {FIELD_LABEL[decision.field]}
            </p>
            <p className={styles.recoveryStep}>{recovery.label}</p>
            <p className={styles.recoveryDetail}>{recovery.detail}</p>
          </div>
        )}
      </div>
    </Region>
  )
}
