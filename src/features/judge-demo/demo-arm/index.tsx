import { Chip } from "@/shared/ui/primitives/chip"
import { DECISION_AT_MS, type DemoArm, type DemoPhase } from "../demo-arms"
import styles from "./styles.module.css"

export type DemoArmPanelProps = {
  readonly arm: DemoArm
  readonly phase: DemoPhase
  readonly headingLevel: "h2" | "h3"
}

export function DemoArmPanel({ arm, phase, headingLevel }: DemoArmPanelProps) {
  const Heading = headingLevel
  const gated = arm.id === "pair-rule"
  const asked = phase !== "resting"
  return (
    <section
      className={[styles.arm, gated ? styles.armGated : styles.armUngated].join(" ")}
      aria-label={arm.title}
    >
      <header className={styles.armHead}>
        <Heading className={styles.armTitle}>
          {arm.title}{" "}
          <Chip tone={gated ? "lasa" : "escalated"}>
            {gated ? "shipped" : "comparison only"}
          </Chip>
        </Heading>
        <p className={styles.armNote}>{arm.note}</p>
      </header>
      <div className={styles.said}>
        <p className={styles.saidWho}>
          {asked
            ? `What the agent said at ${(DECISION_AT_MS / 1000).toFixed(1)} seconds`
            : "What the agent will say"}
        </p>
        <p className={styles.saidText}>{arm.agentLine}</p>
        <p className={styles.saidWho}>
          decided by the same gate function, reason code{" "}
          <code className={styles.reasonCode}>{arm.decision.reasonCode}</code>
        </p>
        <p className={styles.saidWho}>
          {phase === "settled" ? "What the caller answered" : "What the caller will answer"}
        </p>
        <p className={styles.saidText}>&ldquo;{arm.answer.callerSaid}&rdquo;</p>
        <p className={styles.saidWho}>
          read as <code className={styles.reasonCode}>{arm.answer.reasonCode}</code>
        </p>
      </div>
      <div
        className={[styles.outcome, gated ? styles.outcomeGated : styles.outcomeUngated].join(
          " ",
        )}
      >
        <p className={styles.outcomeLabel}>{arm.outcomeLabel}</p>
        <p className={styles.outcomeValue}>{arm.value[phase]}</p>
        <p className={styles.outcomeBody}>{arm.body[phase]}</p>
      </div>
    </section>
  )
}
