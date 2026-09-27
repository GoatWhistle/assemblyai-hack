import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowIcon, ExternalIcon } from "@/shared/ui/icons"
import {
  EXTERNAL_REL,
  isExternalHref,
  NEW_TAB_NOTE,
} from "@/shared/ui/navigation/external-link"
import styles from "./styles.module.css"

type ActionLinkTone = "neutral" | "primary" | "quiet"
type ActionLinkSize = "small" | "medium" | "large"
type ActionLinkIcon = "none" | "forward" | "back"

export type ActionLinkProps = {
  readonly href: string
  readonly tone?: ActionLinkTone
  readonly size?: ActionLinkSize
  readonly icon?: ActionLinkIcon
  readonly children: ReactNode
}

const TONE_CLASS: Record<ActionLinkTone, string> = {
  neutral: "",
  primary: styles.primary ?? "",
  quiet: styles.quiet ?? "",
}

const SIZE_CLASS: Record<ActionLinkSize, string> = {
  small: styles.small ?? "",
  medium: "",
  large: styles.large ?? "",
}

export function ActionLink({
  href,
  tone = "neutral",
  size = "medium",
  icon = "none",
  children,
}: ActionLinkProps) {
  const classes = [styles.action, TONE_CLASS[tone], SIZE_CLASS[size]]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  if (isExternalHref(href)) {
    return (
      <a className={classes} href={href} target="_blank" rel={EXTERNAL_REL}>
        {children}
        <ExternalIcon className={styles.icon} />
        <span className="visually-hidden"> {NEW_TAB_NOTE}</span>
      </a>
    )
  }
  return (
    <Link className={classes} href={href}>
      {icon === "back" ? (
        <ArrowIcon direction="left" className={`${styles.icon} ${styles.back}`} />
      ) : null}
      {children}
      {icon === "forward" ? (
        <ArrowIcon direction="right" className={`${styles.icon} ${styles.forward}`} />
      ) : null}
    </Link>
  )
}
