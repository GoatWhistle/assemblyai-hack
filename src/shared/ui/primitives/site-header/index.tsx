import Link from "next/link"
import type { ReactNode } from "react"
import { Wordmark } from "../wordmark"
import styles from "./styles.module.css"

export type SiteSection = "call" | "replay" | "docs" | "order"

type LegacySection = "home" | "live" | "how" | "compare" | "demo" | "metrics"

export type SiteHeaderProps = {
  readonly current: SiteSection | LegacySection
  readonly status?: ReactNode
}

const LINKS: readonly {
  readonly key: SiteSection
  readonly href: string
  readonly label: string
}[] = [
  { key: "call", href: "/", label: "Call" },
  { key: "replay", href: "/demo", label: "Replay" },
  { key: "docs", href: "/docs", label: "Docs" },
]

const SECTION_OF: Readonly<Record<SiteSection | LegacySection, SiteSection>> = {
  call: "call",
  replay: "replay",
  docs: "docs",
  order: "order",
  home: "call",
  live: "call",
  demo: "replay",
  how: "docs",
  compare: "docs",
  metrics: "docs",
}

export function SiteHeader({ current, status }: SiteHeaderProps) {
  const section = SECTION_OF[current]
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/">
        <Wordmark />
        <span className={styles.name}>
          Read<span className={styles.nameBack}>back</span>
        </span>
      </Link>

      <nav className={styles.nav} aria-label="Sections">
        {LINKS.map((link) => (
          <Link
            key={link.key}
            className={[styles.link, section === link.key ? styles.linkActive : ""]
              .filter((value) => value !== "")
              .join(" ")}
            href={link.href}
            aria-current={section === link.key ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {status === undefined ? null : <div className={styles.status}>{status}</div>}
    </header>
  )
}
