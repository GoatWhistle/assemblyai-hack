import type { LatencySummary } from "@/features/latency/latency-recorder"
import styles from "./styles.module.css"

export type LatencyChipProps = {
  readonly label: string
  readonly summary: LatencySummary
}

function ms(value: number | null): string {
  return value === null ? "—" : `${value} ms`
}

export function LatencyChip({ label, summary }: LatencyChipProps) {
  return (
    <p className={styles.chip}>
      <span className={styles.label}>{label}</span>
      {summary.n === 0 ? (
        <span className={styles.value}>
          <span aria-hidden="true">—</span>
          <span className="visually-hidden">not measured yet</span>
        </span>
      ) : (
        <span className={styles.value}>
          last {ms(summary.last)} · p50 {ms(summary.p50)} · p95 {ms(summary.p95)} · n=
          {summary.n}
        </span>
      )}
    </p>
  )
}
