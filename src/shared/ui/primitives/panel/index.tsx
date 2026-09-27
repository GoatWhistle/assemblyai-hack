import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type PanelTone = "default" | "tinted" | "alert"

export type PanelProps = {
  readonly title?: ReactNode
  readonly note?: ReactNode
  readonly tone?: PanelTone
  readonly variant?: "raised" | "flat" | "sunken"
  readonly padding?: "normal" | "tight" | "none"
  readonly headingLevel?: 2 | 3
  readonly labelledBy?: string
  readonly as?: "section" | "div" | "article" | "aside"
  readonly children: ReactNode
}

const TONE_CLASS: Readonly<Record<PanelTone, string | undefined>> = {
  default: undefined,
  tinted: styles.tinted,
  alert: styles.alert,
}

const VARIANT_TONE: Readonly<Record<NonNullable<PanelProps["variant"]>, PanelTone>> = {
  raised: "default",
  flat: "default",
  sunken: "tinted",
}

const PADDING_CLASS = {
  normal: undefined,
  tight: styles.tight,
  none: styles.none,
} as const

function join(...parts: readonly (string | undefined)[]): string {
  return parts.filter((part) => part !== undefined && part !== "").join(" ")
}

export function panelTone(
  tone: PanelTone | undefined,
  variant: PanelProps["variant"],
): PanelTone {
  return tone ?? (variant === undefined ? "default" : VARIANT_TONE[variant])
}

export function Panel({
  title,
  note,
  tone,
  variant,
  padding = "normal",
  headingLevel = 2,
  labelledBy,
  as = "section",
  children,
}: PanelProps) {
  const Tag = as
  const Title = headingLevel === 2 ? "h2" : "h3"
  const resolved = panelTone(tone, variant)
  const classes = join(
    styles.panel,
    TONE_CLASS[resolved],
    variant === "raised" ? styles.raised : undefined,
  )
  return (
    <Tag className={classes} aria-labelledby={labelledBy} data-panel={resolved}>
      {title === undefined ? null : (
        <header className={styles.header}>
          <Title className={styles.title}>{title}</Title>
          {note === undefined ? null : <p className={styles.note}>{note}</p>}
        </header>
      )}
      <div className={join(styles.body, PADDING_CLASS[padding])}>{children}</div>
    </Tag>
  )
}
