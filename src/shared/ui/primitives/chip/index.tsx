import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type ChipTone =
  | "neutral"
  | "plain"
  | "accepted"
  | "asking"
  | "pending"
  | "escalated"
  | "aborted"
  | "lasa"

export type ChipProps = {
  readonly tone?: ChipTone
  readonly glyph?: string
  readonly monospace?: boolean
  readonly title?: string
  readonly children: ReactNode
}

const TONE_CLASS: Record<ChipTone, string> = {
  neutral: "",
  plain: styles.plain ?? "",
  accepted: styles.accepted ?? "",
  asking: styles.asking ?? "",
  pending: styles.pending ?? "",
  escalated: styles.escalated ?? "",
  aborted: styles.aborted ?? "",
  lasa: styles.lasa ?? "",
}

export function Chip({ tone = "neutral", glyph, monospace, title, children }: ChipProps) {
  const classes = [styles.chip, TONE_CLASS[tone], monospace === true ? styles.code : ""]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  return (
    <span className={classes} title={title}>
      {glyph === undefined ? null : (
        <span className={styles.glyph} aria-hidden="true">
          {glyph}
        </span>
      )}
      {children}
    </span>
  )
}
