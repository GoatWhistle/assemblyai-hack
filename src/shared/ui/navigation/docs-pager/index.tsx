"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowIcon } from "@/shared/ui/icons"
import { type DocsPage, flattenPages, pageAt } from "../docs-tree"
import styles from "./styles.module.css"

export const PAGER_LABEL = "Previous and next page"

export type DocsPagerProps = {
  readonly pages: readonly DocsPage[]
}

export function neighbours(
  pages: readonly DocsPage[],
  current: DocsPage | null,
): { readonly previous: DocsPage | null; readonly next: DocsPage | null } {
  const order = flattenPages(pages)
  const index = current === null ? -1 : order.findIndex((page) => page.href === current.href)
  if (index < 0) {
    return { previous: null, next: null }
  }
  return { previous: order[index - 1] ?? null, next: order[index + 1] ?? null }
}

export function DocsPager({ pages }: DocsPagerProps) {
  const { previous, next } = neighbours(pages, pageAt(pages, usePathname()))
  if (previous === null && next === null) {
    return null
  }
  return (
    <nav className={styles.pager} aria-label={PAGER_LABEL}>
      {previous === null ? null : (
        <Link
          href={previous.href}
          className={`${styles.link} ${styles.previous}`}
          rel="prev"
          aria-label={`Previous page: ${previous.label}`}
        >
          <span className={styles.direction}>
            <ArrowIcon direction="left" className={styles.arrow} />
            Previous
          </span>
          <span className={styles.label}>{previous.label}</span>
        </Link>
      )}
      {next === null ? null : (
        <Link
          href={next.href}
          className={`${styles.link} ${styles.next}`}
          rel="next"
          aria-label={`Next page: ${next.label}`}
        >
          <span className={styles.direction}>
            Next
            <ArrowIcon direction="right" className={styles.arrow} />
          </span>
          <span className={styles.label}>{next.label}</span>
        </Link>
      )}
    </nav>
  )
}
