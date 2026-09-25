import Link from "next/link"
import type { ReactNode } from "react"
import { Wordmark } from "../wordmark"
import styles from "./styles.module.css"

export type SiteHeaderProps = {
  readonly current: "home" | "live" | "how" | "compare" | "demo" | "metrics" | "order"
  readonly status?: ReactNode
}

const LINKS: readonly {
  readonly key: string
  readonly href: string
  readonly label: string
}[] = [
  { key: "live", href: "/live", label: "Live call" },
  { key: "how", href: "/how-it-works", label: "How it works" },
  { key: "compare", href: "/compare", label: "Compare" },
  { key: "demo", href: "/demo", label: "Replay" },
  { key: "metrics", href: "/metrics", label: "Measurements" },
]

export function SiteHeader({ current, status }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <Link
        className={styles.brand}
        href="/"
        aria-current={current === "home" ? "page" : undefined}
      >
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
