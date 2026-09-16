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
}

export function StateShell({
  glyph,
  title,
  body,
  actions,
  centered,
  alarmed,
  note,
}: StateShellProps) {
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
      <p className={styles.title}>{title}</p>
      <div className={styles.body}>{body}</div>
      {note === undefined ? null : <p className={styles.body}>{note}</p>}
      {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
