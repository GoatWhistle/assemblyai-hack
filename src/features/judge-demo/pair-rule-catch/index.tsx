import { useId } from "react"
import type { BenchmarkRow } from "@/domain"
import type { FalseAskTally } from "@/features/metrics/measured-figures"
import { READ_BACK_COST } from "@/features/metrics/report-figures"
import { Figure, FigureGroup } from "@/shared/ui/data-display/figure"
import { Method } from "@/shared/ui/data-display/method"
import { MoreLink } from "@/shared/ui/navigation/more-link"
import { Heading, Lede } from "@/shared/ui/typography/heading"
import styles from "./styles.module.css"

export const CATCH_FIGURES_HREF = "/metrics#headline"

export const CATCH_SECTION_TITLE = "What the pair rule catches, and what it costs"

export type PairRuleCatchProps = {
  readonly without: BenchmarkRow
  readonly shipped: BenchmarkRow
  readonly tally?: FalseAskTally | null
}

function askedOf(tally: FalseAskTally | null): string {
  return tally === null
    ? ""
    : ` The coverage run put it to ${tally.byPairRule} of ${tally.of} correctly heard names.`
}

export function PairRuleCatch({ without, shipped, tally = null }: PairRuleCatchProps) {
  const headingId = useId()
  const cost = READ_BACK_COST
  return (
    <section className={styles.catch} aria-labelledby={headingId}>
      <div className={styles.head}>
        <Heading level={2} id={headingId}>
          {CATCH_SECTION_TITLE}
        </Heading>
        <Lede>
          The replay is one call. Measured over {shipped.n ?? "an unrecorded number of"} seeded
          pair mishearings, each answered by a reflex yes, the two columns end the same way
          every time.
        </Lede>
      </div>
      <div className={styles.body}>
        <div className={`${styles.part} ${styles.pair}`}>
          <FigureGroup label="Wrong drug written after a reflex yes">
            <Figure
              label="Pair rule off"
              unit="wrong drug written"
              value={without.value}
              tone="alert"
            />
            <Figure
              label="Pair rule on"
              unit="wrong drug written"
              value={shipped.value}
              tone="accepted"
            />
          </FigureGroup>
          <p className={styles.method}>
            <Method
              command={shipped.command}
              n={shipped.n ?? "not recorded"}
              set={shipped.input === "text" ? "text candidates" : shipped.input}
            />
          </p>
        </div>
        <div className={styles.part}>
          <FigureGroup label="What the pair rule's question costs">
            <Figure
              label="Pair rule on, cost of its question"
              unit="longer than a plain read-back, per name it asks about"
              value={cost.extraSeconds}
              note={`About ${cost.contrastiveSeconds} against ${cost.plainSeconds}, at the desktop synthesiser's rate; the agent's own voice has not been timed.${askedOf(tally)}`}
              method={{
                command: cost.command,
                n:
                  tally === null
                    ? "not recorded"
                    : `${tally.of} plain, ${tally.byPairRule} contrastive`,
                set: "synthesised speech",
              }}
            />
          </FigureGroup>
        </div>
      </div>
      <div className={styles.more}>
        <MoreLink href={CATCH_FIGURES_HREF}>Every figure and its method</MoreLink>
      </div>
    </section>
  )
}
