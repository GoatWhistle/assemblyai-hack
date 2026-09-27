import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type DocHeaderProps = {
  readonly title: ReactNode
  readonly lede: ReactNode
  readonly children?: ReactNode
}

export function DocHeader({ title, lede, children }: DocHeaderProps) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.lede}>{lede}</p>
      {children === undefined ? null : <div className={styles.extra}>{children}</div>}
    </div>
  )
}
