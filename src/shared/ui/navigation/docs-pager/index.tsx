"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type DocsPage, flattenPages, pageAt } from "../docs-tree"
import styles from "./styles.module.css"

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
    <nav className={styles.pager} aria-label="Previous and next page">
      {previous === null ? (
        <span />
      ) : (
        <Link
          href={previous.href}
          className={styles.link}
          rel="prev"
          aria-label={`Previous page: ${previous.label}`}
        >
          <span className={styles.direction}>Previous</span>
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
          <span className={styles.direction}>Next</span>
          <span className={styles.label}>{next.label}</span>
        </Link>
      )}
    </nav>
  )
}
