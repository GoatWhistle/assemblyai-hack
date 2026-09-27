"use client"

import { useCallback, useState } from "react"
import { ConfirmationMode } from "@/domain"
import { Code } from "@/shared/ui/data-display/code"
import { Button } from "@/shared/ui/primitives/button"
import { Panel } from "@/shared/ui/primitives/panel"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import { ATTACKS, type AttackId, type AttackOutcome, runAttack } from "./attacks"
import styles from "./styles.module.css"

type OutcomeOutputProps = {
  readonly outcome: AttackOutcome
  readonly explains: string
  readonly attempt: number
}

type LabelledProps = {
  readonly label: string
  readonly machine?: boolean
  readonly children: string
}

function Labelled({ label, machine = false, children }: LabelledProps) {
  return (
    <span className={styles.line}>
      <span className={styles.label}>{label}</span>
      <span className={machine ? styles.machine : styles.spoken}>{children}</span>
    </span>
  )
}

function OutcomeOutput({ outcome, explains, attempt }: OutcomeOutputProps) {
  return (
    <output key={attempt} className={outcome.written ? styles.written : styles.refused}>
      <span className={styles.verdict}>
        <StatusChip status={outcome.written ? "alert" : "refused"}>
          {outcome.written ? "written" : "refused"}
        </StatusChip>
        {outcome.reasonCode === null ? null : <Code>{outcome.reasonCode}</Code>}
      </span>
      {outcome.refusal === null ? null : (
        <Labelled label="what the gate itself raised, verbatim" machine>
          {outcome.refusal}
        </Labelled>
      )}
      {outcome.askedFor === undefined ? null : (
        <Labelled label="what the agent asks instead">{outcome.askedFor}</Labelled>
      )}
      {outcome.ruleCited === undefined ? null : (
        <Labelled label="the rule this comes from" machine>
          {outcome.ruleCited}
        </Labelled>
      )}
      <span className={styles.explains}>{explains}</span>
    </output>
  )
}

export function AttackConsole() {
  const [outcomes, setOutcomes] = useState<ReadonlyMap<AttackId, AttackOutcome>>(new Map())
  const [attempts, setAttempts] = useState<ReadonlyMap<AttackId, number>>(new Map())

  const mount = useCallback((id: AttackId) => {
    const outcome = runAttack(id, ConfirmationMode.ReadBack)
    setOutcomes((previous) => new Map(previous).set(id, outcome))
    setAttempts((previous) => new Map(previous).set(id, (previous.get(id) ?? 0) + 1))
  }, [])

  const tried = outcomes.size
  const written = [...outcomes.values()].filter((outcome) => outcome.written).length

  return (
    <div className={styles.console}>
      <Panel as="div" padding="none">
        <div className={styles.frame}>
          <ul
            className={styles.attempts}
            aria-label="Attempts to write a value the gate did not prove"
          >
            {ATTACKS.map((attack) => {
              const outcome = outcomes.get(attack.id)
              return (
                <li key={attack.id} className={styles.attempt} data-attack={attack.id}>
                  <span className={styles.head}>
                    <span className={styles.title}>{attack.title}</span>
                    <span className={styles.claims}>{attack.asks}</span>
                  </span>
                  <span className={styles.act}>
                    <Button size="small" onClick={() => mount(attack.id)}>
                      {outcome === undefined ? "Attempt the write" : "Attempt again"}
                    </Button>
                  </span>
                  {outcome === undefined ? null : (
                    <OutcomeOutput
                      outcome={outcome}
                      explains={attack.explains}
                      attempt={attempts.get(attack.id) ?? 0}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </Panel>
      {tried === 0 ? null : (
        <p className={styles.tally}>
          {tried} {tried === 1 ? "attempt" : "attempts"}, {written} written. The order can only
          hold a value that a validator passed or a human confirmed aloud, and there is no
          function that produces one otherwise.
        </p>
      )}
    </div>
  )
}
