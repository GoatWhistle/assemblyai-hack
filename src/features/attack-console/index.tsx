"use client"

import { useCallback, useState } from "react"
import { ConfirmationMode } from "@/domain"
import { Code } from "@/shared/ui/data-display/code"
import { Table, type TableColumn } from "@/shared/ui/data-display/table"
import { Button } from "@/shared/ui/primitives/button"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import { ATTACKS, type AttackId, type AttackOutcome, runAttack } from "./attacks"
import styles from "./styles.module.css"

type OutcomeOutputProps = {
  readonly outcome: AttackOutcome
  readonly explains: string
  readonly attempt: number
}

const COLUMNS: readonly TableColumn[] = [
  { key: "attempt", title: "Attempt", rowHeader: true },
  { key: "claims", title: "What it claims", kind: "muted", stack: "bare" },
  { key: "answer", title: "The gate's answer", stack: "bare" },
]

function Labelled({ label, children }: { readonly label: string; readonly children: string }) {
  return (
    <span className={styles.line}>
      <span className={styles.label}>{label}</span>
      {children}
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
        <span className={styles.machine}>
          <Labelled label="what the gate itself raised, verbatim">{outcome.refusal}</Labelled>
        </span>
      )}
      {outcome.askedFor === undefined ? null : (
        <Labelled label="what the agent asks instead">{outcome.askedFor}</Labelled>
      )}
      {outcome.ruleCited === undefined ? null : (
        <span className={styles.machine}>
          <Labelled label="the rule this comes from">{outcome.ruleCited}</Labelled>
        </span>
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
      <Table
        label="Attempts to write a value the gate did not prove"
        columns={COLUMNS}
        rows={ATTACKS.map((attack) => {
          const outcome = outcomes.get(attack.id)
          return {
            key: attack.id,
            cells: {
              attempt: attack.title,
              claims: attack.asks,
              answer: (
                <span className={styles.answer}>
                  <Button size="small" onClick={() => mount(attack.id)}>
                    {outcome === undefined ? "Attempt the write" : "Attempt again"}
                  </Button>
                  {outcome === undefined ? null : (
                    <OutcomeOutput
                      outcome={outcome}
                      explains={attack.explains}
                      attempt={attempts.get(attack.id) ?? 0}
                    />
                  )}
                </span>
              ),
            },
          }
        })}
      />
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
