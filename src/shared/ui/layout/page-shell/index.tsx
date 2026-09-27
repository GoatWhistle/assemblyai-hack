import type { ReactNode } from "react"
import { SiteHeader, type SiteHeaderProps } from "@/shared/ui/primitives/site-header"
import styles from "./styles.module.css"

export type PageShellProps = {
  readonly current?: SiteHeaderProps["current"]
  readonly status?: ReactNode
  readonly children: ReactNode
}

export function PageShell({ current, status, children }: PageShellProps) {
  return (
    <div className={styles.shell}>
      <SiteHeader current={current} status={status} />
      {children}
    </div>
  )
}
