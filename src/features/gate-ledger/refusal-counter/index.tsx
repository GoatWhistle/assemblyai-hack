import { Figure, FigureGroup } from "@/shared/ui/data-display/figure"
import { Panel } from "@/shared/ui/primitives/panel"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
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

export const NOT_OBSERVED = "not observed yet"

const NO_DECISIONS_NOTE =
  "The gate has decided nothing yet in this session. Absence is shown as absence: a zero here would claim the gate ran and refused nothing."

function outOf(total: number | null): string | undefined {
  return total === null ? undefined : `of ${total}`
}

function ReasonFigures({
  tally,
  reasons,
}: {
  readonly tally: RefusalTally
  readonly reasons: readonly RefusalReason[]
}) {
  return (
    <FigureGroup>
      {reasons.map((reason) => (
        <Figure
          key={reason}
          figureKey={reason}
          label={REFUSAL_COPY[reason].label}
          value={countFor(tally, reason)}
          interval={outOf(tally.blocked)}
          tone={REFUSAL_COPY[reason].tone}
          absentLabel={NOT_OBSERVED}
        />
      ))}
    </FigureGroup>
  )
}

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
        <FigureGroup label="Decisions in this session">
          <Figure
            figureKey="decided"
            label="Values the agent proposed and the gate decided on"
            value={tally.toolCalls}
            absentLabel={NOT_OBSERVED}
          />
          <Figure
            figureKey="confirmed"
            label="Confirmed: a validator passed it or a human said it back"
            value={tally.confirmed}
            interval={outOf(tally.toolCalls)}
            tone="accepted"
            absentLabel={NOT_OBSERVED}
          />
          <Figure
            figureKey="blocked"
            label="Blocked: refused entry until it could be proved"
            value={tally.blocked}
            interval={outOf(tally.toolCalls)}
            tone="asking"
            absentLabel={NOT_OBSERVED}
          />
        </FigureGroup>
        {observed ? null : <span className={styles.absence}>{NO_DECISIONS_NOTE}</span>}
      </output>

      <div className={styles.split}>
        <section className={styles.group} aria-label="The three reasons to ask again">
          <p className={styles.groupTitle}>The three reasons to ask again</p>
          <p className={styles.groupBody}>
            These are not interchangeable and are never summed into one bar. The third fires
            regardless of the recognizer's certainty.
          </p>
          <ReasonFigures tally={tally} reasons={THE_THREE_REASONS} />
        </section>

        <section className={styles.group} aria-label="Refusals that are not one of the three">
          <p className={styles.groupTitle}>Refusals that are not one of the three</p>
          <p className={styles.groupBody}>
            Field policy and an exhausted attempt budget also stop a value. They are listed
            apart so the three reasons keep their meaning.
          </p>
          <ReasonFigures tally={tally} reasons={OTHER_REFUSAL_REASONS} />
        </section>
      </div>

      {lasaOverride === null || lasaOverride === 0 ? null : (
        <output className={styles.override} aria-live="polite">
          <p className={styles.overrideTop}>
            <StatusChip status="pair">look-alike pair outranks certainty</StatusChip>
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
