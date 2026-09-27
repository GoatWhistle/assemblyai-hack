import type { ReactNode } from "react"
import type { BenchmarkRow } from "@/domain"
import { Method } from "@/shared/ui/data-display/method"
import { AbsentValue } from "../absent-value"
import { FalseAskHeadline } from "../false-ask-headline"
import type { FalseAskTally } from "../measured-figures"
import type { MetricDefinition } from "../metric-definitions"
import { type AbCatch, READ_BACK_COST } from "../report-figures"
import styles from "./styles.module.css"

export const CATCH_TITLE = "What the pair rule catches"
export const COST_TITLE = "What the pair rule costs on correct names"
export const CATALOGUE_TITLE = "What caught the real recognizer errors: the catalogue check"
export const NEUTRAL_HEADLINE_TITLE = "What the pair rule catches, and what it costs"

export type CatchCostHeadlineProps = {
  readonly ab: AbCatch | null
  readonly confident: MetricDefinition | null
  readonly catalogue: MetricDefinition | null
  readonly tally: FalseAskTally | null
  readonly contrastive: BenchmarkRow | null
  readonly compact?: boolean
}

export function headlineTitle(ab: AbCatch | null, tally: FalseAskTally | null): string {
  if (ab === null || tally === null || ab.with.value !== `0/${ab.with.n}`) {
    return NEUTRAL_HEADLINE_TITLE
  }
  return `The pair rule stops every seeded mishearing, and puts its longer question to ${tally.byPairRule} of ${tally.of} correct names`
}

function Figure({ value }: { readonly value: string | null | undefined }): ReactNode {
  return value === null || value === undefined ? <AbsentValue /> : value
}

function Catch({ ab, compact }: { readonly ab: AbCatch | null; readonly compact: boolean }) {
  return (
    <article className={`${styles.panel} ${styles.catch}`} data-headline="catch">
      <h3 className={styles.kicker}>{CATCH_TITLE}</h3>
      <p className={styles.figure}>
        Without the pair rule, a reflex yes writes{" "}
        <strong data-figure="without">
          <Figure value={ab?.without.value} />
        </strong>{" "}
        seeded pair mishearings. With it,{" "}
        <strong data-figure="with">
          <Figure value={ab?.with.value} />
        </strong>
        .
      </p>
      {ab === null ? null : (
        <p className={styles.note}>
          {compact
            ? null
            : "Both arms read every drug name back and differ by the pair rule alone. How often a real caller answers a plain read-back by reflex is not measured. "}
          <Method command={ab.with.command} n={String(ab.with.n)} set="text candidates" />
        </p>
      )}
    </article>
  )
}

function Catalogue({
  confident,
  catalogue,
}: Pick<CatchCostHeadlineProps, "confident" | "catalogue">) {
  return (
    <article className={`${styles.panel} ${styles.catalogue}`} data-headline="catalogue">
      <h3 className={styles.kicker}>{CATALOGUE_TITLE}</h3>
      <p className={styles.second}>
        The catalogue check refused{" "}
        <strong data-figure="catalogue">
          <Figure value={catalogue?.value} />
        </strong>{" "}
        recorded recognizer errors, because each heard name matches no prescription product.
        None of them was heard as a published partner, so the pair rule caught none of them, and
        its catch above rests on the seeded pairs.
      </p>
      <p className={styles.second}>
        Of the same errors,{" "}
        <strong data-figure="confident">
          <Figure value={confident?.value} />
        </strong>{" "}
        sat at or above the drug-name threshold, so a threshold alone would have written them.{" "}
        {confident === null ? null : (
          <Method
            command={confident.command}
            n={String(confident.n ?? "")}
            set="synthesised speech through the live recognizer"
          />
        )}
      </p>
    </article>
  )
}

function Seconds({ tally }: Pick<CatchCostHeadlineProps, "tally">) {
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
        set="synthesised speech"
      />
    </p>
  )
}

export function CatchCostHeadline({
  ab,
  confident,
  catalogue,
  tally,
  contrastive,
  compact = false,
}: CatchCostHeadlineProps) {
  return (
    <div className={styles.frame}>
      <div className={styles.pair}>
        <Catch ab={ab} compact={compact} />
        <article className={`${styles.panel} ${styles.cost}`} data-headline="cost">
          <h3 className={styles.kicker}>{COST_TITLE}</h3>
          <FalseAskHeadline tally={tally} contrastive={contrastive} compact={compact} />
          {compact ? null : <Seconds tally={tally} />}
        </article>
        {compact ? null : <Catalogue confident={confident} catalogue={catalogue} />}
      </div>
    </div>
  )
}
