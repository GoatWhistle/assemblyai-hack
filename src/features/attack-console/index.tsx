"use client"

import { useCallback, useState } from "react"
import { ConfirmationMode } from "@/domain"
import { Button } from "@/shared/ui/primitives/button"
import { ATTACKS, type AttackId, type AttackOutcome, runAttack } from "./attacks"
import styles from "./styles.module.css"

type OutcomeOutputProps = {
  readonly outcome: AttackOutcome
  readonly explains: string
  readonly attempt: number
}

function OutcomeOutput({ outcome, explains, attempt }: OutcomeOutputProps) {
  return (
    <output key={attempt} className={outcome.written ? styles.written : styles.refused}>
      <p className={styles.verdict}>
        {outcome.written ? "written" : "refused"}
        {outcome.reasonCode === null ? null : (
          <code className={styles.code}>{outcome.reasonCode}</code>
        )}
      </p>
      {outcome.refusal === null ? null : (
        <p className={styles.refusal}>
          <span className={styles.askedLabel}>what the gate itself raised, verbatim</span>
          {outcome.refusal}
        </p>
      )}
      {outcome.askedFor === undefined ? null : (
        <p className={styles.asked}>
          <span className={styles.askedLabel}>what the agent asks instead</span>
          {outcome.askedFor}
        </p>
      )}
      {outcome.ruleCited === undefined ? null : (
        <p className={styles.cited}>
          <span className={styles.askedLabel}>the rule this comes from</span>
          {outcome.ruleCited}
        </p>
      )}
      <p className={styles.explains}>{explains}</p>
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
    <section className={styles.console}>
      <div className={styles.lede}>
        <h2 className={styles.title}>Try to write a value the gate did not prove</h2>
        <p className={styles.body}>
          Each button builds a real candidate, runs the real decision function and calls the
          only constructor that can write a field. Nothing here is staged: the refusal you read
          is the string the gate raised.
        </p>
      </div>

      <ol className={styles.attacks}>
        {ATTACKS.map((attack) => {
          const outcome = outcomes.get(attack.id)
          return (
            <li key={attack.id} className={styles.attack}>
              <div className={styles.head}>
                <p className={styles.attackTitle}>{attack.title}</p>
                <Button size="small" onClick={() => mount(attack.id)}>
                  {outcome === undefined ? "Attempt the write" : "Attempt again"}
                </Button>
              </div>
              <p className={styles.asks}>{attack.asks}</p>

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
      </ol>

      {tried === 0 ? null : (
        <p className={styles.tally}>
          {tried} {tried === 1 ? "attempt" : "attempts"}, {written} written. The order can only
          hold a value that a validator passed or a human confirmed aloud, and there is no
          function that produces one otherwise.
        </p>
      )}
    </section>
  )
}
