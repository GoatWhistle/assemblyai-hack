import type { BenchmarkRow } from "@/domain"
import { AbsentValue } from "../absent-value"
import { FalseAskHeadline } from "../false-ask-headline"
import type { FalseAskTally } from "../measured-figures"
import type { MetricDefinition } from "../metric-definitions"
import { type AbCatch, READ_BACK_COST } from "../report-figures"
import styles from "./styles.module.css"

export const CATCH_TITLE = "What the pair rule catches"
export const COST_TITLE = "What it costs on correct names"

export type CatchCostHeadlineProps = {
  readonly ab: AbCatch | null
  readonly confident: MetricDefinition | null
  readonly tally: FalseAskTally | null
  readonly contrastive: BenchmarkRow | null
}

function Method({
  command,
  n,
  input,
  on,
}: {
  readonly command: string
  readonly n: string
  readonly input: string
  readonly on: string | null
}) {
  return (
    <span className={styles.method}>
      <code className={styles.code}>{command}</code> n = {n}, {input}
      {on === null ? null : (
        <>
          , <time dateTime={on}>{on}</time>
        </>
      )}
    </span>
  )
}

function Catch({ ab, confident }: Pick<CatchCostHeadlineProps, "ab" | "confident">) {
  return (
    <article className={styles.panel} data-headline="catch">
      <h3 className={styles.kicker}>{CATCH_TITLE}</h3>
      <p className={styles.figure}>
        Without the pair rule, a reflex yes writes{" "}
        <strong data-figure="without">
          {ab === null ? <AbsentValue /> : ab.without.value}
        </strong>{" "}
        seeded pair mishearings. With it,{" "}
        <strong data-figure="with">{ab === null ? <AbsentValue /> : ab.with.value}</strong>.
      </p>
      {ab === null ? null : (
        <p className={styles.note}>
          Both arms read every drug name back and differ by the pair rule alone. How often a
          real caller answers a plain read-back by reflex is not measured.{" "}
          <Method
            command={ab.with.command}
            n={String(ab.with.n)}
            input="text candidates"
            on={ab.with.measuredOn}
          />
        </p>
      )}
      <p className={styles.second}>
        <strong data-figure="confident">
          {confident === null || confident.value === null ? <AbsentValue /> : confident.value}
        </strong>{" "}
        recorded recognizer errors sat at or above the drug-name threshold, so a threshold alone
        would have written them.{" "}
        {confident === null ? null : (
          <Method
            command={confident.command}
            n={String(confident.n ?? "")}
            input="synthesised speech through the live recognizer"
            on={confident.measuredOn}
          />
        )}
      </p>
    </article>
  )
}

function Seconds({
  tally,
  contrastive,
}: Pick<CatchCostHeadlineProps, "tally" | "contrastive">) {
  const cost = READ_BACK_COST
  return (
    <p className={styles.note} data-figure="seconds">
      A contrastive question runs about <strong>{cost.contrastiveSeconds}</strong> (
      {cost.contrastiveWords}) against about <strong>{cost.plainSeconds}</strong> (
      {cost.plainWords}) for a plain read-back: <strong>{cost.extraSeconds}</strong> more per
      name asked that way. The seconds use {cost.wordsPerSecond} per second, the desktop
      synthesiser's rate over <code className={styles.code}>{cost.rateSet}</code>; the agent's
      own voice has not been timed, and each spelled letter counts as a word, so the contrastive
      figure overstates the letters.{" "}
      <Method
        command={cost.command}
        n={
          tally === null ? "not recorded" : `${tally.of} plain, ${tally.byPairRule} contrastive`
        }
        input="synthesised speech"
        on={contrastive?.measuredOn ?? null}
      />
    </p>
  )
}

export function CatchCostHeadline({
  ab,
  confident,
  tally,
  contrastive,
}: CatchCostHeadlineProps) {
  return (
    <div className={styles.pair}>
      <Catch ab={ab} confident={confident} />
      <article className={styles.panel} data-headline="cost">
        <h3 className={styles.kicker}>{COST_TITLE}</h3>
        <FalseAskHeadline tally={tally} />
        <Seconds tally={tally} contrastive={contrastive} />
      </article>
    </div>
  )
}
