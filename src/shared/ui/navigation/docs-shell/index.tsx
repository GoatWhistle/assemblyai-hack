import type { ReactNode } from "react"
import { RouteFocus } from "./route-focus"
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
    <>
      <div className={styles.header}>{header}</div>
      <div className={styles.shell}>
        <RouteFocus mainId={mainId} />
        <div className={styles.grid}>
          <div className={styles.nav}>{nav}</div>
          <main className={styles.main} id={mainId}>
            {children}
          </main>
          <div className={styles.toc}>{toc}</div>
        </div>
      </div>
    </>
  )
}
