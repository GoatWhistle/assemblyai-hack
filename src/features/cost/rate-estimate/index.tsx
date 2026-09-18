import { Chip } from "@/shared/ui/primitives/chip"
import { Panel } from "@/shared/ui/primitives/panel"
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
  RATE_CHECKED_ON,
  RATE_SOURCE_URL,
} from "../published-rate"
import styles from "./styles.module.css"

export type RateEstimateProps = {
  readonly estimate: CostEstimate | null
}

export function RateEstimate({ estimate }: RateEstimateProps) {
  return (
    <Panel
      title={ESTIMATE_TITLE}
      note={`rate checked ${RATE_CHECKED_ON}`}
      padding="tight"
      variant="flat"
    >
      <output className={styles.reading} aria-live="polite">
        <span className={estimate === null ? styles.absent : styles.numeral}>
          {estimate === null ? "no elapsed time yet" : formatUsd(estimate.usd)}
        </span>
        <span className={styles.readingLabel}>{READING_LABEL}</span>
        {estimate === null ? <span className={styles.note}>{ABSENCE_NOTE}</span> : null}
      </output>

      <p className={styles.denial}>
        <Chip tone="plain">not a bill</Chip>
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
        <a className={styles.link} href={RATE_SOURCE_URL} rel="noreferrer noopener">
          the price page these three rates come from
        </a>
      </p>
    </Panel>
  )
}
