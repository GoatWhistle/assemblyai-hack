import type { ReactNode } from "react"
import { Method, type MethodProps } from "@/shared/ui/data-display/method"
import styles from "./styles.module.css"

export const ABSENT_MARK = String.fromCharCode(0x2014)

export const NOT_MEASURED = "not measured"

export type FigureTone = "neutral" | "accepted" | "asking" | "lasa" | "alert"

export type FigureProps = {
  readonly figureKey?: string
  readonly label: ReactNode
  readonly unit?: ReactNode
  readonly value: ReactNode | null
  readonly interval?: string
  readonly note?: ReactNode
  readonly method?: MethodProps
  readonly tone?: FigureTone
  readonly absentLabel?: string
}

export type FigureGroupProps = {
  readonly label?: string
  readonly children: ReactNode
}

const TONE_CLASS: Readonly<Record<FigureTone, string | undefined>> = {
  neutral: undefined,
  accepted: styles.accepted,
  asking: styles.asking,
  lasa: styles.lasa,
  alert: styles.alert,
}

export function Absent({ label = NOT_MEASURED }: { readonly label?: string }) {
  return (
    <span className={styles.absent} role="img" aria-label={label}>
      {ABSENT_MARK}
    </span>
  )
}

export function FigureGroup({ label, children }: FigureGroupProps) {
  return (
    <dl className={styles.group} aria-label={label}>
      {children}
    </dl>
  )
}

export function Figure({
  figureKey,
  label,
  unit,
  value,
  interval,
  note,
  method,
  tone = "neutral",
  absentLabel,
}: FigureProps) {
  const reading = [styles.reading, value === null ? undefined : TONE_CLASS[tone]]
    .filter((part) => part !== undefined && part !== "")
    .join(" ")
  return (
    <div className={styles.figure} data-figure={figureKey}>
      <dt className={styles.label}>
        {label}
        {unit === undefined ? null : <span className={styles.unit}>{unit}</span>}
      </dt>
      <dd className={reading}>
        {value === null ? <Absent label={absentLabel} /> : value}
        {interval === undefined || value === null ? null : (
          <span className={styles.interval}>{interval}</span>
        )}
      </dd>
      {note === undefined ? null : <dd className={styles.note}>{note}</dd>}
      {method === undefined ? null : (
        <dd className={styles.note}>
          <Method {...method} />
        </dd>
      )}
    </div>
  )
}
