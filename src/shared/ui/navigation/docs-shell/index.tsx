import type { ReactNode } from "react"
import { PageShell } from "@/shared/ui/layout/page-shell"
import { RouteFocus } from "./route-focus"
import styles from "./styles.module.css"

export type DocsShellProps = {
  readonly nav: ReactNode
  readonly toc: ReactNode
  readonly mainId: string
  readonly children: ReactNode
}

export function DocsShell({ nav, toc, mainId, children }: DocsShellProps) {
  return (
    <PageShell current="docs">
      <RouteFocus mainId={mainId} />
      <div className={styles.grid}>
        <div className={styles.nav}>{nav}</div>
        <main className={styles.main} id={mainId}>
          {children}
        </main>
        <div className={styles.toc}>{toc}</div>
      </div>
    </PageShell>
  )
}
