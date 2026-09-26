import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type DocsShellProps = {
  readonly header: ReactNode
  readonly nav: ReactNode
  readonly toc: ReactNode
  readonly mainId: string
  readonly children: ReactNode
}

export function DocsShell({ header, nav, toc, mainId, children }: DocsShellProps) {
  return (
    <div className={styles.shell}>
      {header}
      <div className={styles.grid}>
        <div className={styles.nav}>{nav}</div>
        <main className={styles.main} id={mainId}>
          {children}
        </main>
        <div className={styles.toc}>{toc}</div>
      </div>
    </div>
  )
}
