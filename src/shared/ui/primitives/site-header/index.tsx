"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { GitHubIcon } from "@/shared/ui/icons"
import { useGlide } from "@/shared/ui/motion/use-glide"
import { EXTERNAL_REL, NEW_TAB_NOTE } from "@/shared/ui/navigation/text-link"
import { DisclaimerNotice } from "@/shared/ui/states/disclaimer"
import { Wordmark } from "../wordmark"
import styles from "./styles.module.css"

export const REPOSITORY_URL = "https://github.com/GoatWhistle/assemblyai-hack"

export type SiteSection = "call" | "replay" | "docs" | "order"

type LegacySection = "home" | "live" | "how" | "compare" | "demo" | "metrics"

export type SiteHeaderProps = {
  readonly current?: SiteSection | LegacySection
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

type NavLink = {
  readonly key: string
  readonly href: string
  readonly label: string
}

type SiteNavProps = {
  readonly links: readonly NavLink[]
  readonly section: string | null
}

let lastShown: string | null = null

function SiteNav({ links, section }: SiteNavProps) {
  const nav = useRef<HTMLElement | null>(null)
  const [from] = useState(() => lastShown)
  useGlide(nav, section, from)
  useEffect(() => {
    lastShown = section
  }, [section])
  return (
    <nav className={styles.nav} aria-label="Sections" ref={nav}>
      {links.map((link) => (
        <Link
          key={link.key}
          className={[styles.link, section === link.key ? styles.linkActive : ""]
            .filter((value) => value !== "")
            .join(" ")}
          href={link.href}
          data-glide-key={link.key}
          aria-current={section === link.key ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}

export function SiteHeader({ current }: SiteHeaderProps) {
  const section = current === undefined ? null : SECTION_OF[current]
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <Link className={styles.brand} href="/">
          <Wordmark size={32} />
          <span className={styles.name}>
            Read<span className={styles.nameBack}>back</span>
          </span>
        </Link>
        <DisclaimerNotice />
      </div>

      <SiteNav links={LINKS} section={section} />

      <a className={styles.repo} href={REPOSITORY_URL} target="_blank" rel={EXTERNAL_REL}>
        <GitHubIcon className={styles.repoMark} />
        <span className="visually-hidden">{`Source code on GitHub ${NEW_TAB_NOTE}`}</span>
      </a>
    </header>
  )
}
