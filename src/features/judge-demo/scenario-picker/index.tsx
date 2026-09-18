"use client"

import { useId, useState } from "react"
import { GateAction } from "@/domain"
import { FieldCard } from "@/features/field-card"
import { GateBanner } from "@/features/gate-banner"
import { Chip } from "@/shared/ui/primitives/chip"
import { DEFAULT_SCENARIO_ID, SCENARIOS, type ScenarioId, scenarioFor } from "./scenarios"
import styles from "./styles.module.css"

export * from "./scenarios"

const SCENARIO_PICKER_TITLE = "One button, one scenario"

export const SCENARIO_PICKER_LEDE =
  "Each button replays one recorded situation through the shipped gate and the shipped validators. The label of the scenario on screen sits in the header above, so what is being shown is never a guess."

const SCENARIO_HEADER_LABEL = "Showing"

export const SCENARIO_GROUP_LABEL = "Recorded scenarios"

export function ScenarioPicker() {
  const [selected, setSelected] = useState<ScenarioId>(DEFAULT_SCENARIO_ID)
  const scenario = scenarioFor(selected)
  const titleId = useId()
  const refuses = scenario.decision.action !== GateAction.Accept

  return (
    <section className={styles.block} aria-labelledby={titleId}>
      <header className={styles.head}>
        <div className={styles.headTop}>
          <h2 className={styles.title} id={titleId}>
            {SCENARIO_PICKER_TITLE}
          </h2>
          <p className={styles.current} aria-live="polite">
            <span className={styles.currentLabel}>{SCENARIO_HEADER_LABEL}</span>
            <span className={styles.currentName}>{scenario.label}</span>
            <Chip tone={refuses ? "lasa" : "accepted"} monospace>
              {scenario.decision.reasonCode}
            </Chip>
          </p>
        </div>
        <p className={styles.headerNote}>{scenario.headerNote}</p>
        <p className={styles.lede}>{SCENARIO_PICKER_LEDE}</p>
      </header>

      <fieldset className={styles.buttons}>
        <legend className={styles.legend}>{SCENARIO_GROUP_LABEL}</legend>
        {SCENARIOS.map((entry) => {
          const active = entry.id === selected
          const entryRefuses = entry.decision.action !== GateAction.Accept
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={active}
              className={[styles.button, active ? styles.buttonActive : ""]
                .filter((value) => value !== "")
                .join(" ")}
              onClick={() => setSelected(entry.id)}
            >
              <span className={styles.buttonLabel}>{entry.label}</span>
              <span className={styles.buttonOutcome}>
                {entryRefuses ? "the gate asks first" : "the gate writes it"}
              </span>
            </button>
          )
        })}
      </fieldset>

      <div className={styles.detail}>
        <dl className={styles.heard}>
          <dt className={styles.heardTerm}>What the caller said</dt>
          <dd className={styles.heardValue}>{scenario.spoken}</dd>
          <dt className={styles.heardTerm}>What the recognizer returned</dt>
          <dd className={styles.heardValue}>{scenario.heard}</dd>
        </dl>
        <p className={styles.why}>{scenario.whyThisOne}</p>
      </div>

      <GateBanner decision={scenario.decision} />
      <FieldCard
        key={scenario.id}
        candidate={scenario.candidate}
        decision={scenario.decision}
      />
    </section>
  )
}
