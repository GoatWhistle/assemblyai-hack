import Link from "next/link"
import type { ReactNode } from "react"
import { Wordmark } from "../wordmark"
import styles from "./styles.module.css"

export type SiteHeaderProps = {
  readonly current: "intake" | "how" | "demo" | "metrics" | "start"
  readonly status?: ReactNode
}

const LINKS: readonly {
  readonly key: string
  readonly href: string
  readonly label: string
}[] = [
  { key: "start", href: "/start", label: "Start here" },
  { key: "how", href: "/how-it-works", label: "How it works" },
  { key: "demo", href: "/demo", label: "Demonstration" },
  { key: "metrics", href: "/metrics", label: "Measurements" },
]

export function SiteHeader({ current, status }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-current={current === "intake" || undefined}>
        <Wordmark />
        <span className={styles.name}>
          Read<span className={styles.nameBack}>back</span>
        </span>
      </Link>

      <nav className={styles.nav} aria-label="Sections">
        {LINKS.map((link) => (
          <Link
            key={link.key}
            className={[styles.link, current === link.key ? styles.linkActive : ""]
              .filter((value) => value !== "")
              .join(" ")}
            href={link.href}
            aria-current={current === link.key ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {status === undefined ? null : <div className={styles.status}>{status}</div>}
    </header>
  )
}
