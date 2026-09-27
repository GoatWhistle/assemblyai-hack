import type { ReactNode } from "react"
import { ExternalIcon } from "@/shared/ui/icons"
import styles from "./styles.module.css"

export const EXTERNAL_REL = "noopener noreferrer"

export const NEW_TAB_NOTE = "(opens in a new tab)"

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

export type ExternalLinkProps = {
  readonly href: string
  readonly className?: string
  readonly children: ReactNode
}

export function ExternalLink({ href, className, children }: ExternalLinkProps) {
  const classes = [styles.link, className ?? ""].filter((value) => value !== "").join(" ")
  return (
    <a className={classes} href={href} target="_blank" rel={EXTERNAL_REL}>
      {children}
      <ExternalIcon className={styles.icon} />
      <span className="visually-hidden"> {NEW_TAB_NOTE}</span>
    </a>
  )
}
