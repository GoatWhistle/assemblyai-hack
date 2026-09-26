import { type FieldCandidate, type GateDecision, ReasonCode } from "@/domain"
import { Chip } from "@/shared/ui/primitives/chip"
import { FIELD_LABEL } from "../intake/field-language"
import { ContrastQuestion } from "./contrast-question"
import { stanceFor } from "./hypothesis-language"
import {
  ACTION_LANGUAGE,
  describeReason,
  type ReasonSeverity,
  SEVERITY_TONE,
} from "./reason-language"
import { ReasonStance } from "./reason-stance"
import { RECOVERY_STEP } from "./recovery-language"
import { signatureOf } from "./signature"
import { SignatureLine } from "./signature-line"
import styles from "./styles.module.css"

const SEVERITY_CLASS: Record<ReasonSeverity, string> = {
  accepted: styles.accepted ?? "",
  asking: styles.asking ?? "",
  refused: styles.refused ?? "",
  lasa: styles.lasa ?? "",
  escalated: styles.escalated ?? "",
  aborted: styles.aborted ?? "",
}

export type GateBannerProps = {
  readonly decision: GateDecision | null
  readonly candidate?: FieldCandidate | null
}

export function GateBanner({ decision, candidate = null }: GateBannerProps) {
  if (decision === null) {
    return (
      <output aria-live="polite" className={styles.region}>
        <div className={styles.banner}>
          <p className={styles.headline}>The gate has not been asked anything yet</p>
          <p className={styles.idle}>
            Every proposed value passes through one decision function before it can enter the
            order. Its verdict, and the reason code behind it, appears here as it happens.
          </p>
        </div>
      </output>
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
    <output aria-live="polite" className={styles.region}>
      <div className={classes} key={verdictKey} data-motion="fade">
        {signature === null ? null : <SignatureLine signature={signature} />}
        <div className={styles.top}>
          <p className={styles.headline}>{reason.headline}</p>
          <Chip tone={SEVERITY_TONE[reason.severity]} monospace>
            {reason.code}
          </Chip>
          <Chip tone="plain">{ACTION_LANGUAGE[decision.action]}</Chip>
          <Chip tone="plain">{FIELD_LABEL[decision.field]}</Chip>
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
    </output>
  )
}
