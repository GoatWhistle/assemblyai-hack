import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type StateShellProps = {
  readonly glyph: string
  readonly title: string
  readonly body: ReactNode
  readonly actions?: ReactNode
  readonly centered?: boolean
  readonly alarmed?: boolean
  readonly note?: ReactNode
  readonly headingLevel?: "h2" | "h3" | "h4"
}

export function StateShell({
  glyph,
  title,
  body,
  actions,
  centered,
  alarmed,
  note,
  headingLevel,
}: StateShellProps) {
  const Title = headingLevel ?? "p"
  const shell = [styles.state, centered === true ? styles.centered : ""]
    .filter((value) => value !== "")
    .join(" ")
  const mark = [styles.glyph, alarmed === true ? styles.alarmed : ""]
    .filter((value) => value !== "")
    .join(" ")
  return (
    <div className={shell} role={alarmed === true ? "alert" : undefined}>
      <span className={mark} aria-hidden="true">
        {glyph}
      </span>
      <Title className={styles.title}>{title}</Title>
      <div className={styles.body}>{body}</div>
      {note === undefined ? null : <p className={styles.body}>{note}</p>}
      {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
