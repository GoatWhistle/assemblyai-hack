"use client"

import type { ReactNode } from "react"
import { useDetailsMotion } from "@/shared/ui/motion/use-details-motion"
import { Chevron } from "../chevron"
import styles from "./styles.module.css"

export type DisclosureTone = "plain" | "framed"

export type DisclosureProps = {
  readonly summary: ReactNode
  readonly children: ReactNode
  readonly tone?: DisclosureTone
  readonly defaultOpen?: boolean
  readonly id?: string
  readonly meta?: ReactNode
}

const TONE_CLASS: Record<DisclosureTone, string> = {
  plain: "",
  framed: styles.framed ?? "",
}

export function Disclosure({
  summary,
  children,
  tone = "plain",
  defaultOpen = false,
  id,
  meta,
}: DisclosureProps) {
  const ref = useDetailsMotion()
  const classes = [styles.disclosure, TONE_CLASS[tone]]
    .filter((value) => value !== "")
    .join(" ")
  return (
    <details className={classes} open={defaultOpen} id={id} ref={ref}>
      <summary className={styles.summary}>
        <span className={styles.label}>{summary}</span>
        {meta === undefined ? null : <span className={styles.meta}>{meta}</span>}
        <Chevron className={styles.chevron} />
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  )
}
