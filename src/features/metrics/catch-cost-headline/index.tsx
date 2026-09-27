import type { ReactNode } from "react"
import type { BenchmarkRow } from "@/domain"
import { Code } from "@/shared/ui/data-display/code"
import { Figure, FigureGroup } from "@/shared/ui/data-display/figure"
import { Method } from "@/shared/ui/data-display/method"
import { Panel } from "@/shared/ui/primitives/panel"
import { Heading } from "@/shared/ui/typography/heading"
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

function marked(key: string, value: string | null | undefined): ReactNode | null {
  return value === null || value === undefined ? null : <span data-figure={key}>{value}</span>
}

function Catch({ ab, compact }: { readonly ab: AbCatch | null; readonly compact: boolean }) {
  return (
    <div className={styles.catch} data-headline="catch">
      <Panel as="article">
        <div className={styles.body}>
          <Heading level={3}>{CATCH_TITLE}</Heading>
          <FigureGroup label={CATCH_TITLE}>
            <Figure
              label="Written without the pair rule"
              unit="seeded pair mishearings, each answered by a reflex yes"
              value={marked("without", ab?.without.value)}
              tone="alert"
            />
            <Figure
              label="Written with the pair rule"
              value={marked("with", ab?.with.value)}
              tone="accepted"
            />
          </FigureGroup>
          {ab === null ? null : (
            <p className={styles.note}>
              {compact
                ? null
                : "Both arms read every drug name back and differ by the pair rule alone; how often a real caller answers a plain read-back by reflex is not measured. "}
              <Method command={ab.with.command} n={String(ab.with.n)} set="text candidates" />
            </p>
          )}
        </div>
      </Panel>
    </div>
  )
}

function Catalogue({
  confident,
  catalogue,
}: Pick<CatchCostHeadlineProps, "confident" | "catalogue">) {
  return (
    <div className={styles.catalogue} data-headline="catalogue">
      <Panel as="article">
        <div className={styles.body}>
          <Heading level={3}>{CATALOGUE_TITLE}</Heading>
          <FigureGroup label={CATALOGUE_TITLE}>
            <Figure
              label="Recorded recognizer errors the catalogue check refused"
              value={marked("catalogue", catalogue?.value)}
              note="Each heard name matches no prescription product. None was heard as a published partner, so the pair rule caught none of them, and its catch above rests on the seeded pairs."
            />
            <Figure
              label="Of the same errors, at or above the drug-name threshold"
              value={marked("confident", confident?.value)}
              tone="alert"
              note="A threshold alone would have written every one of them."
              method={
                confident === null
                  ? undefined
                  : {
                      command: confident.command,
                      n: String(confident.n ?? ""),
                      set: "synthesised speech through the live recognizer",
                    }
              }
            />
          </FigureGroup>
        </div>
      </Panel>
    </div>
  )
}

function Seconds({ tally }: Pick<CatchCostHeadlineProps, "tally">) {
  const cost = READ_BACK_COST
  return (
    <p className={styles.note} data-figure="seconds">
      A contrastive question runs about {cost.contrastiveSeconds} ({cost.contrastiveWords})
      against about {cost.plainSeconds} ({cost.plainWords}) for a plain read-back:{" "}
      {cost.extraSeconds} more per name asked that way. The seconds use {cost.wordsPerSecond}{" "}
      per second, the desktop synthesiser's rate over <Code>{cost.rateSet}</Code>; the agent's
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
        <div className={styles.cost} data-headline="cost">
          <Panel as="article">
            <div className={styles.body}>
              <Heading level={3}>{COST_TITLE}</Heading>
              <FalseAskHeadline tally={tally} contrastive={contrastive} compact={compact}>
                {compact ? null : <Seconds tally={tally} />}
              </FalseAskHeadline>
            </div>
          </Panel>
        </div>
        {compact ? null : <Catalogue confident={confident} catalogue={catalogue} />}
      </div>
    </div>
  )
}
