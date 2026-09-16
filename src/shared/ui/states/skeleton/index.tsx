import styles from "./styles.module.css"

export type SkeletonProps = {
  readonly lines?: number
  readonly label?: string
}

const WIDTHS = ["72%", "94%", "58%", "84%", "66%"]

export function Skeleton({ lines = 3, label = "Loading" }: SkeletonProps) {
  return (
    <div className={styles.stack} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: lines }, (_, index) => WIDTHS[index % WIDTHS.length]).map(
        (width, index) => (
          <span key={`line-${index}-${width}`} className={styles.line} style={{ width }} />
        ),
      )}
    </div>
  )
}
