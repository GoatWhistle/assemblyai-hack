import Link from "next/link"
import type { ReactNode } from "react"
import styles from "./styles.module.css"

type ActionLinkTone = "neutral" | "primary" | "quiet"
type ActionLinkSize = "small" | "medium" | "large"

export type ActionLinkProps = {
  readonly href: string
  readonly tone?: ActionLinkTone
  readonly size?: ActionLinkSize
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
  children,
}: ActionLinkProps) {
  const classes = [styles.action, TONE_CLASS[tone], SIZE_CLASS[size]]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  return (
    <Link className={classes} href={href}>
      {children}
    </Link>
  )
}
