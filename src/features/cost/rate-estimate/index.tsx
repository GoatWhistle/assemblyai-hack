import { Figure, FigureGroup } from "@/shared/ui/data-display/figure"
import { MoreLink } from "@/shared/ui/navigation/more-link"
import { Panel } from "@/shared/ui/primitives/panel"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import {
  ABSENCE_NOTE,
  DRIFT_NOTE,
  ESTIMATE_TITLE,
  METHOD_LINE,
  NOT_A_BILL,
  READING_LABEL,
  WHY_COMBINED,
} from "../estimate-language"
import {
  type CostEstimate,
  formatPerHour,
  formatUsd,
  PUBLISHED_RATES,
  RATE_SOURCE_URL,
} from "../published-rate"
import styles from "./styles.module.css"

export type RateEstimateProps = {
  readonly estimate: CostEstimate | null
}

export function RateEstimate({ estimate }: RateEstimateProps) {
  return (
    <Panel title={ESTIMATE_TITLE} note="published rates" padding="tight" variant="flat">
      <output className={styles.reading} aria-live="polite">
        <FigureGroup>
          <Figure
            figureKey="estimate"
            label={READING_LABEL}
            value={estimate === null ? null : formatUsd(estimate.usd)}
            absentLabel="no elapsed time yet"
            note={estimate === null ? ABSENCE_NOTE : undefined}
          />
        </FigureGroup>
      </output>

      <p className={styles.denial}>
        <StatusChip status="tag">not a bill</StatusChip>
        <span>{NOT_A_BILL}</span>
      </p>

      <dl className={styles.rates}>
        {PUBLISHED_RATES.map((rate) => (
          <div key={rate.product} className={styles.rate}>
            <dt className={styles.rateProduct}>{rate.product}</dt>
            <dd className={styles.rateValue}>{formatPerHour(rate.perHourUsd)}</dd>
            <dd className={styles.rateWhy}>{rate.why}</dd>
          </div>
        ))}
        <div className={styles.rate}>
          <dt className={styles.rateProduct}>Combined, both sockets open</dt>
          <dd className={styles.rateValue}>
            {estimate === null
              ? formatPerHour(
                  PUBLISHED_RATES.reduce((total, rate) => total + rate.perHourUsd, 0),
                )
              : formatPerHour(estimate.perHourUsd)}
          </dd>
          <dd className={styles.rateWhy}>{WHY_COMBINED}</dd>
        </div>
      </dl>

      <p className={styles.method}>{METHOD_LINE}</p>
      <p className={styles.method}>{DRIFT_NOTE}</p>
      <p className={styles.source}>
        <MoreLink href={RATE_SOURCE_URL}>the price page these three rates come from</MoreLink>
      </p>
    </Panel>
  )
}
