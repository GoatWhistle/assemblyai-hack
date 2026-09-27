"use client"

import { useId, useState } from "react"
import { GateAction } from "@/domain"
import { FieldCard } from "@/features/field-card"
import { GateBanner } from "@/features/gate-banner"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import { Heading } from "@/shared/ui/typography/heading"
import {
  DEFAULT_SCENARIO_ID,
  isProbeId,
  PROBES,
  type Probe,
  type ProbeId,
  probeFor,
  SCENARIOS,
  type Scenario,
  type ScenarioId,
  scenarioFor,
} from "./scenarios"
import { ServerProbePanel, ServerRunChip } from "./server-probe"
import { useServerRun } from "./server-run"
import styles from "./styles.module.css"

export * from "./scenarios"

const SCENARIO_PICKER_TITLE = "One button, one scenario"

export const SCENARIO_PICKER_LEDE =
  "Each button replays one synthesised situation through the shipped gate and the shipped validators. The label of the scenario on screen sits in the header above, so what is being shown is never a guess."

const SCENARIO_HEADER_LABEL = "Showing"

export const SCENARIO_GROUP_LABEL = "Synthesised scenarios"

export const PROBE_GROUP_LABEL = "Adversarial scenarios, synthesised"

const PROBE_OUTCOME: Record<Probe["runsOn"], string> = {
  browser: "decided in this page by the shipped gate",
  server: "sent to the server, which runs it",
}

function shownFor(id: ScenarioId | ProbeId): Scenario | Probe {
  return isProbeId(id) ? probeFor(id) : scenarioFor(id)
}

export function ScenarioPicker() {
  const [selected, setSelected] = useState<ScenarioId | ProbeId>(DEFAULT_SCENARIO_ID)
  const server = useServerRun()
  const scenario = shownFor(selected)
  const titleId = useId()
  const serverSide = "runsOn" in scenario && scenario.runsOn === "server" ? scenario : null
  const decision = "decision" in scenario ? scenario.decision : null
  const refuses = decision !== null && decision.action !== GateAction.Accept

  const pick = (probe: Probe) => {
    setSelected(probe.id)
    if (probe.runsOn === "server") {
      server.run(probe.id)
    }
  }

  return (
    <section className={styles.block} aria-labelledby={titleId}>
      <div className={styles.choose}>
        <header className={styles.head}>
          <div className={styles.headTop}>
            <Heading level={2} id={titleId}>
              {SCENARIO_PICKER_TITLE}
            </Heading>
            <p className={styles.current} aria-live="polite">
              <span className={styles.currentLabel}>{SCENARIO_HEADER_LABEL}</span>
              <span className={styles.currentName}>{scenario.label}</span>
              {decision === null ? (
                <ServerRunChip state={server.state} />
              ) : (
                <StatusChip status={refuses ? "pair" : "written"} code>
                  {decision.reasonCode}
                </StatusChip>
              )}
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

        <fieldset className={styles.buttons}>
          <legend className={styles.legend}>{PROBE_GROUP_LABEL}</legend>
          {PROBES.map((probe) => (
            <button
              key={probe.id}
              type="button"
              aria-pressed={probe.id === selected}
              className={[styles.button, probe.id === selected ? styles.buttonActive : ""]
                .filter((value) => value !== "")
                .join(" ")}
              onClick={() => pick(probe)}
            >
              <span className={styles.buttonLabel}>{probe.label}</span>
              <span className={styles.buttonOutcome}>{PROBE_OUTCOME[probe.runsOn]}</span>
            </button>
          ))}
        </fieldset>
      </div>

      <div className={styles.shown} key={selected}>
        {serverSide !== null ? (
          <ServerProbePanel probe={serverSide} state={server.state} />
        ) : null}
        {decision === null || !("candidate" in scenario) ? null : (
          <>
            <div className={styles.detail}>
              <dl className={styles.heard}>
                <dt className={styles.heardTerm}>What the caller said</dt>
                <dd className={styles.heardValue}>{scenario.spoken}</dd>
                <dt className={styles.heardTerm}>What the recognizer returned</dt>
                <dd className={styles.heardValue}>{scenario.heard}</dd>
              </dl>
              <p className={styles.why}>{scenario.whyThisOne}</p>
            </div>

            <GateBanner decision={decision} />
            <FieldCard
              key={scenario.id}
              candidate={scenario.candidate}
              decision={decision}
              explainedBeside
            />
          </>
        )}
      </div>
    </section>
  )
}
