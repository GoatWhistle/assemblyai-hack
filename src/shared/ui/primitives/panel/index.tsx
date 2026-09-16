import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type PanelProps = {
  readonly title?: ReactNode
  readonly note?: ReactNode
  readonly variant?: "raised" | "flat" | "sunken"
  readonly padding?: "normal" | "tight" | "none"
  readonly labelledBy?: string
  readonly as?: "section" | "div" | "article" | "aside"
  readonly children: ReactNode
}

const VARIANT_CLASS = {
  raised: "",
  flat: styles.flat ?? "",
  sunken: styles.sunken ?? "",
} as const

const PADDING_CLASS = {
  normal: "",
  tight: styles.tight ?? "",
  none: styles.none ?? "",
} as const

export function Panel({
  title,
  note,
  variant = "raised",
  padding = "normal",
  labelledBy,
  as = "section",
  children,
}: PanelProps) {
  const Tag = as
  const classes = [styles.panel, VARIANT_CLASS[variant]]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  const bodyClasses = [styles.body, PADDING_CLASS[padding]]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  return (
    <Tag className={classes} aria-labelledby={labelledBy}>
      {title === undefined ? null : (
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {note === undefined ? null : <p className={styles.note}>{note}</p>}
        </header>
      )}
      <div className={bodyClasses}>{children}</div>
    </Tag>
  )
}
