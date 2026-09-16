import styles from "./styles.module.css"

export const TICK_COUNT = 20

const TICK_POSITIONS: readonly number[] = Array.from(
  { length: TICK_COUNT },
  (_, index) => (index + 1) / TICK_COUNT,
)

export type CertaintyProps = {
  readonly minConfidence: number
  readonly threshold: number
  readonly overruled?: boolean
  readonly overruledBy?: string
  readonly caveat?: string
}

export function formatCertainty(value: number): string {
  return value.toFixed(2)
}

export function Certainty({
  minConfidence,
  threshold,
  overruled = false,
  overruledBy,
  caveat = "Acoustic certainty over the source words. It cannot tell one real word from another that sounds like it.",
}: CertaintyProps) {
  const lit = Math.round(minConfidence * TICK_COUNT)
  const thresholdPercent = threshold * 100
  const classes = [styles.certainty, overruled ? styles.overruled : ""]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  return (
    <div className={classes}>
      <p className={styles.label}>
        <span className={styles.who}>Recognizer said, of itself</span>
        <span className={styles.reading}>{formatCertainty(minConfidence)} min over span</span>
      </p>
      <div
        className={styles.track}
        role="img"
        aria-label={`Recognizer self-reported certainty ${formatCertainty(minConfidence)} of 1.00, against a field threshold of ${formatCertainty(threshold)}`}
      >
        {TICK_POSITIONS.map((position, index) => {
          const isLit = index < lit
          const tickClass = [
            styles.tick,
            isLit ? (overruled ? styles.tickQuiet : styles.tickLit) : "",
          ]
            .filter((value) => value !== undefined && value !== "")
            .join(" ")
          return <span key={`tick-${position}`} className={tickClass} />
        })}
        <span className={styles.threshold} style={{ left: `${thresholdPercent}%` }} />
      </div>
      <p className={styles.thresholdLabel}>
        field threshold {formatCertainty(threshold)} marked on the track
      </p>
      {overruled && overruledBy !== undefined ? (
        <p className={styles.overruledNote}>{overruledBy}</p>
      ) : (
        <p className={styles.caveat}>{caveat}</p>
      )}
    </div>
  )
}
