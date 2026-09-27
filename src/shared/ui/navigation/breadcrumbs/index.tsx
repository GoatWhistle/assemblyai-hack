import Link from "next/link"
import { ChevronRightIcon } from "@/shared/ui/icons"
import styles from "./styles.module.css"

export const BREADCRUMB_LABEL = "Breadcrumb"

export type Crumb = {
  readonly href: string
  readonly label: string
}

export type BreadcrumbsProps = {
  readonly trail: readonly Crumb[]
  readonly current: string
}

export function Breadcrumbs({ trail, current }: BreadcrumbsProps) {
  return (
    <nav className={styles.crumbs} aria-label={BREADCRUMB_LABEL}>
      <ol className={styles.list}>
        {trail.map((crumb) => (
          <li className={styles.item} key={crumb.href}>
            <Link className={styles.link} href={crumb.href}>
              {crumb.label}
            </Link>
            <ChevronRightIcon className={styles.separator} />
          </li>
        ))}
        <li className={styles.item}>
          <span className={styles.current} aria-current="page">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  )
}
