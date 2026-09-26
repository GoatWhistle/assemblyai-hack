import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type FoldProps = {
  readonly summary: string
  readonly children: ReactNode
}

export function Fold({ summary, children }: FoldProps) {
  return (
    <details className={styles.fold}>
      <summary className={styles.summary}>{summary}</summary>
      <div className={styles.body}>{children}</div>
    </details>
  )
}
