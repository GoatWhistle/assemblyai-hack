import type { ReactNode } from "react"
import { SiteHeader, type SiteHeaderProps } from "@/shared/ui/primitives/site-header"
import { PrintDisclaimer } from "@/shared/ui/states/disclaimer"
import styles from "./styles.module.css"

export type PageShellProps = {
  readonly current?: SiteHeaderProps["current"]
  readonly children: ReactNode
  readonly printDisclaimer?: boolean
}

export function PageShell({ current, children, printDisclaimer = true }: PageShellProps) {
  return (
    <div className={styles.shell}>
      <SiteHeader current={current} />
      {children}
      {printDisclaimer ? <PrintDisclaimer /> : null}
    </div>
  )
}
