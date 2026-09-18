import styles from "./styles.module.css"

export const NOT_OBSERVED = "not observed yet"

export type CountedProps = {
  readonly count: number | null
  readonly of?: number | null
  readonly label: string
  readonly absenceNote: string
  readonly tone?: "neutral" | "accepted" | "asking" | "lasa"
  readonly size?: "normal" | "large"
}

const TONE_CLASS: Readonly<Record<NonNullable<CountedProps["tone"]>, string>> = Object.freeze({
  neutral: "",
  accepted: styles.accepted ?? "",
  asking: styles.asking ?? "",
  lasa: styles.lasa ?? "",
})

function isAbsent(count: number | null): boolean {
  return count === null
}

export function Counted({
  count,
  of,
  label,
  absenceNote,
  tone = "neutral",
  size = "normal",
}: CountedProps) {
  const absent = isAbsent(count)
  const readingClasses = [
    styles.reading,
    absent ? styles.absent : TONE_CLASS[tone],
    size === "large" ? styles.large : "",
  ]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  return (
    <div className={styles.counted}>
      <span className={readingClasses}>
        {absent ? NOT_OBSERVED : count}
        {absent || of === null || of === undefined ? null : (
          <span className={styles.denominator}> of {of}</span>
        )}
      </span>
      <span className={styles.label}>{label}</span>
      {absent ? <span className={styles.note}>{absenceNote}</span> : null}
    </div>
  )
}
