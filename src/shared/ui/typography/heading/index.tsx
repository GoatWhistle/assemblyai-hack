import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type HeadingLevel = 1 | 2 | 3 | 4

export type HeadingRank = "page" | "section" | "block"

export type HeadingProps = {
  readonly level: HeadingLevel
  readonly rank?: HeadingRank
  readonly id?: string
  readonly children: ReactNode
}

export type LedeProps = {
  readonly rank?: "page" | "section"
  readonly children: ReactNode
}

export const RANK_FOR_LEVEL: Readonly<Record<HeadingLevel, HeadingRank>> = Object.freeze({
  1: "page",
  2: "section",
  3: "block",
  4: "block",
})

const RANK_CLASS: Readonly<Record<HeadingRank, string | undefined>> = {
  page: styles.page,
  section: styles.section,
  block: styles.block,
}

const TAG = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" } as const

export function headingClass(rank: HeadingRank): string {
  return [styles.heading, RANK_CLASS[rank]]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
}

export function Heading({ level, rank = RANK_FOR_LEVEL[level], id, children }: HeadingProps) {
  const Tag = TAG[level]
  return (
    <Tag className={headingClass(rank)} id={id} data-rank={rank}>
      {children}
    </Tag>
  )
}

export function Lede({ rank = "section", children }: LedeProps) {
  const classes = [styles.lede, rank === "page" ? styles.ledePage : ""]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  return (
    <p className={classes} data-rank={rank}>
      {children}
    </p>
  )
}
