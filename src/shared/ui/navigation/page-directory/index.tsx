import Link from "next/link"
import { ArrowIcon } from "@/shared/ui/icons"
import type { DocsPage } from "../docs-tree"
import styles from "./styles.module.css"

export type PageDirectoryProps = {
  readonly pages: readonly DocsPage[]
  readonly withChildren?: boolean
  readonly nested?: boolean
}

export function PageDirectory({
  pages,
  withChildren = false,
  nested = false,
}: PageDirectoryProps) {
  return (
    <ul className={nested ? `${styles.list} ${styles.nested}` : styles.list}>
      {pages.map((page) => (
        <li key={page.href} className={styles.item}>
          <Link href={page.href} className={styles.link}>
            <span className={styles.label}>{page.label}</span>
            <span className={styles.summary}>{page.summary}</span>
            <span className={styles.path}>{page.href}</span>
            <ArrowIcon direction="right" className={styles.arrow} />
          </Link>
          {withChildren && page.children !== undefined && page.children.length > 0 ? (
            <PageDirectory pages={page.children} withChildren nested />
          ) : null}
        </li>
      ))}
    </ul>
  )
}
