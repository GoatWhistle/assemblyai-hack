import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type CodeProps = {
  readonly children: ReactNode
  readonly breakable?: boolean
}

export function Code({ children, breakable = false }: CodeProps) {
  return (
    <code className={breakable ? `${styles.code} ${styles.breakable}` : styles.code}>
      {children}
    </code>
  )
}
