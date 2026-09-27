import type { CSSProperties } from "react"
import { Heading } from "@/shared/ui/typography/heading"
import { DECISION_AT_MS, type DemoArm, type DemoPhase } from "../demo-arms"
import styles from "./styles.module.css"

const PHASES: readonly DemoPhase[] = ["resting", "asked", "settled"]

export type DemoArmPanelProps = {
  readonly arm: DemoArm
  readonly phase: DemoPhase
  readonly headingLevel: "h2" | "h3"
}

function toneOf(gated: boolean, phase: DemoPhase): string {
  if (phase === "resting") {
    return "undecided"
  }
  if (phase === "asked") {
    return gated ? "lasa" : "threshold"
  }
  return gated ? "committed" : "refused"
}

export function DemoArmPanel({ arm, phase, headingLevel }: DemoArmPanelProps) {
  const gated = arm.id === "pair-rule"
  const asked = phase !== "resting"
  return (
    <section
      className={styles.arm}
      data-tone={toneOf(gated, phase)}
      style={{ "--arm": gated ? 0 : 1 } as CSSProperties}
      aria-label={arm.title}
    >
      <header className={styles.armHead}>
        <Heading level={headingLevel === "h2" ? 2 : 3} rank="block">
          {arm.title}
        </Heading>
        <p className={styles.armNote}>{arm.note}</p>
      </header>
      <div className={styles.said}>
        <div className={styles.turn}>
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
        </div>
        <div className={styles.turn}>
          <p className={styles.saidWho}>
            {phase === "settled" ? "What the caller answered" : "What the caller will answer"}
          </p>
          <p className={styles.saidText}>&ldquo;{arm.answer.callerSaid}&rdquo;</p>
          <p className={styles.saidWho}>
            read as <code className={styles.reasonCode}>{arm.answer.reasonCode}</code>
          </p>
        </div>
      </div>
      <div className={styles.outcome}>
        <p className={styles.outcomeLabel}>{arm.outcomeLabel}</p>
        <div className={styles.stack}>
          {PHASES.map((entry) => (
            <div
              key={entry}
              className={entry === phase ? styles.current : styles.variant}
              aria-hidden={entry === phase ? undefined : true}
              data-tone={toneOf(gated, entry)}
            >
              <p className={styles.outcomeValue}>{arm.value[entry]}</p>
              <p className={styles.outcomeBody}>{arm.body[entry]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
