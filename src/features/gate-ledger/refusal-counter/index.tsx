import { Counted } from "@/shared/ui/data-display/counted"
import { Chip } from "@/shared/ui/primitives/chip"
import { Panel } from "@/shared/ui/primitives/panel"
import {
  LASA_OUTRANKS_NOTE,
  METHOD_NOTE,
  RE_ASK_IS_NOT_A_FINDING,
  REFUSAL_COPY,
} from "../refusal-language"
import {
  countFor,
  OTHER_REFUSAL_REASONS,
  RefusalReason,
  type RefusalTally,
  THE_THREE_REASONS,
} from "../refusal-tally"
import styles from "./styles.module.css"

export type RefusalCounterProps = {
  readonly tally: RefusalTally
  readonly turnsHeld: number | null
}

const NO_DECISIONS_NOTE =
  "The gate has decided nothing yet in this session. Absence is shown as absence: a zero here would claim the gate ran and refused nothing."

export function RefusalCounter({ tally, turnsHeld }: RefusalCounterProps) {
  const observed = tally.toolCalls !== null
  const lasaOverride = tally.lasaNotBelowThreshold
  return (
    <Panel
      title="What the gate did with this session"
      note={observed ? "counted live in this browser" : "nothing decided yet"}
      padding="tight"
    >
      <output className={styles.headline} aria-live="polite">
        <Counted
          count={tally.toolCalls}
          label="Values the agent proposed and the gate decided on"
          absenceNote={NO_DECISIONS_NOTE}
          size="large"
        />
        <Counted
          count={tally.confirmed}
          of={tally.toolCalls}
          label="Confirmed: a validator passed it or a human said it back"
          absenceNote={NO_DECISIONS_NOTE}
          tone="accepted"
          size="large"
        />
        <Counted
          count={tally.blocked}
          of={tally.toolCalls}
          label="Blocked: refused entry until it could be proved"
          absenceNote={NO_DECISIONS_NOTE}
          tone="asking"
          size="large"
        />
      </output>

      <div className={styles.split}>
        <section className={styles.group} aria-label="The three reasons to ask again">
          <p className={styles.groupTitle}>The three reasons to ask again</p>
          <p className={styles.groupBody}>
            These are not interchangeable and are never summed into one bar. The third fires
            regardless of the recognizer's certainty.
          </p>
          <div className={styles.rows}>
            {THE_THREE_REASONS.map((reason) => (
              <Counted
                key={reason}
                count={countFor(tally, reason)}
                of={tally.blocked}
                label={REFUSAL_COPY[reason].label}
                absenceNote={REFUSAL_COPY[reason].absenceNote}
                tone={REFUSAL_COPY[reason].tone}
              />
            ))}
          </div>
        </section>

        <section className={styles.group} aria-label="Refusals that are not one of the three">
          <p className={styles.groupTitle}>Refusals that are not one of the three</p>
          <p className={styles.groupBody}>
            Field policy and an exhausted attempt budget also stop a value. They are listed
            apart so the three reasons keep their meaning.
          </p>
          <div className={styles.rows}>
            {OTHER_REFUSAL_REASONS.map((reason) => (
              <Counted
                key={reason}
                count={countFor(tally, reason)}
                of={tally.blocked}
                label={REFUSAL_COPY[reason].label}
                absenceNote={REFUSAL_COPY[reason].absenceNote}
                tone={REFUSAL_COPY[reason].tone}
              />
            ))}
          </div>
        </section>
      </div>

      {lasaOverride === null || lasaOverride === 0 ? null : (
        <output className={styles.override} aria-live="polite">
          <p className={styles.overrideTop}>
            <Chip tone="lasa">look-alike pair outranks certainty</Chip>
            <span className={styles.overrideCount}>
              {lasaOverride} of {countFor(tally, RefusalReason.LasaPair) ?? 0}
            </span>
          </p>
          <p className={styles.overrideBody}>{LASA_OUTRANKS_NOTE}</p>
        </output>
      )}

      <p className={styles.stance}>{RE_ASK_IS_NOT_A_FINDING}</p>

      <p className={styles.method}>
        {METHOD_NOTE}{" "}
        {turnsHeld === null
          ? "The number of turns held for this session has not been reported."
          : `Over ${turnsHeld} caller turn${turnsHeld === 1 ? "" : "s"} held for this session.`}
      </p>
    </Panel>
  )
}
