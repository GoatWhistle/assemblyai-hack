import type { GateDecision } from "@/domain"
import { Chip, type ChipTone } from "@/shared/ui/primitives/chip"
import { FIELD_LABEL } from "../intake/field-language"
import { stanceFor } from "./hypothesis-language"
import { ACTION_LANGUAGE, describeReason, type ReasonSeverity } from "./reason-language"
import { ReasonStance } from "./reason-stance"
import { RECOVERY_STEP } from "./recovery-language"
import styles from "./styles.module.css"

const SEVERITY_CLASS: Record<ReasonSeverity, string> = {
  accepted: styles.accepted ?? "",
  asking: styles.asking ?? "",
  lasa: styles.lasa ?? "",
  escalated: styles.escalated ?? "",
  aborted: styles.aborted ?? "",
}

const SEVERITY_CHIP: Record<ReasonSeverity, ChipTone> = {
  accepted: "accepted",
  asking: "asking",
  lasa: "lasa",
  escalated: "escalated",
  aborted: "aborted",
}

export type GateBannerProps = {
  readonly decision: GateDecision | null
}

export function GateBanner({ decision }: GateBannerProps) {
  if (decision === null) {
    return (
      <output className={styles.banner} aria-live="polite">
        <p className={styles.headline}>The gate has not been asked anything yet</p>
        <p className={styles.idle}>
          Every proposed value passes through one decision function before it can enter the
          order. Its verdict, and the reason code behind it, appears here as it happens.
        </p>
      </output>
    )
  }
  const reason = describeReason(decision.reasonCode)
  const recovery = RECOVERY_STEP[decision.reasonCode]
  const stance = stanceFor(decision.reasonCode)
  const classes = [styles.banner, SEVERITY_CLASS[reason.severity]]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  const verdictKey = `${decision.candidateId}:${decision.reasonCode}:${decision.evidence.attempt}`
  return (
    <output className={classes} aria-live="polite" key={verdictKey}>
      <div className={styles.top}>
        <p className={styles.headline}>{reason.headline}</p>
        <Chip tone={SEVERITY_CHIP[reason.severity]} monospace>
          {reason.code}
        </Chip>
        <Chip tone="plain">{ACTION_LANGUAGE[decision.action]}</Chip>
        <Chip tone="plain">{FIELD_LABEL[decision.field]}</Chip>
      </div>
      <p className={styles.because}>{reason.because}</p>
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
    </output>
  )
}
