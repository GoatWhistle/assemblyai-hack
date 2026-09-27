import type { CSSProperties, ReactNode } from "react"
import styles from "./styles.module.css"

export type ChartTone = "neutral" | "threshold" | "validator" | "lasa" | "accepted" | "refused"

export type ShareSegment = {
  readonly key: string
  readonly label: ReactNode
  readonly count: number
  readonly tone?: ChartTone
}

export type ShareBarProps = {
  readonly label: string
  readonly segments: readonly ShareSegment[]
}

export type BarDatum = {
  readonly key: string
  readonly label: ReactNode
  readonly value: number
  readonly max: number
  readonly display: ReactNode
  readonly tone?: ChartTone
}

export type CompareBarsProps = {
  readonly label: string
  readonly bars: readonly BarDatum[]
}

export function shareOf(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0
  }
  return Math.min(Math.max(value / max, 0), 1)
}

export function ShareBar({ label, segments }: ShareBarProps) {
  return (
    <div className={styles.chart}>
      <ul className={styles.share} aria-label={label}>
        {segments.map((segment) => (
          <li
            key={segment.key}
            className={styles.segment}
            data-segment={segment.key}
            data-tone={segment.tone ?? "neutral"}
            style={{ flexGrow: Math.max(segment.count, 1) }}
          >
            <span className={styles.count}>{segment.count}</span>
            <span className={styles.segmentLabel}>{segment.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CompareBars({ label, bars }: CompareBarsProps) {
  return (
    <div className={styles.chart}>
      <ul className={styles.bars} aria-label={label}>
        {bars.map((bar) => (
          <li
            key={bar.key}
            className={styles.bar}
            data-bar={bar.key}
            data-tone={bar.tone ?? "neutral"}
          >
            <span className={styles.barLabel}>{bar.label}</span>
            <span
              className={styles.track}
              aria-hidden="true"
              style={{ "--share": shareOf(bar.value, bar.max) } as CSSProperties}
            >
              <span className={styles.fill} />
            </span>
            <span className={styles.barValue}>{bar.display}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
