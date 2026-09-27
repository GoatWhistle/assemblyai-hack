import type { ReactNode } from "react"
import { DocsTrail } from "../docs-trail"
import styles from "./styles.module.css"

export type DocHeaderProps = {
  readonly title: ReactNode
  readonly lede: ReactNode
  readonly trail?: ReactNode
  readonly children?: ReactNode
}

export function DocHeader({ title, lede, trail, children }: DocHeaderProps) {
  return (
    <div className={styles.header}>
      <DocsTrail
        fallback={trail === undefined ? null : <p className={styles.trail}>{trail}</p>}
      />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.lede}>{lede}</p>
      {children === undefined ? null : <div className={styles.extra}>{children}</div>}
    </div>
  )
}
