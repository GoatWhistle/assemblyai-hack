import type { ReactNode } from "react"
import { SiteHeader, type SiteHeaderProps } from "@/shared/ui/primitives/site-header"
import styles from "./styles.module.css"

export type PageShellProps = {
  readonly current?: SiteHeaderProps["current"]
  readonly children: ReactNode
}

export function PageShell({ current, children }: PageShellProps) {
  return (
    <div className={styles.shell}>
      <SiteHeader current={current} />
      {children}
    </div>
  )
}
