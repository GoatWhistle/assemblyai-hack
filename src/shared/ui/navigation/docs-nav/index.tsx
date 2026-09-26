"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type KeyboardEvent, type MouseEvent, useEffect, useId, useRef, useState } from "react"
import { Chevron } from "../chevron"
import {
  containsPage,
  type DocsLinkGroup,
  type DocsPage,
  pageAt,
  sectionHref,
} from "../docs-tree"
import { useActiveSection } from "../use-active-section"
import styles from "./styles.module.css"

export type DocsNavProps = {
  readonly pages: readonly DocsPage[]
  readonly related?: DocsLinkGroup
  readonly label?: string
}

type ItemProps = {
  readonly page: DocsPage
  readonly current: DocsPage | null
  readonly active: string | null
  readonly onJump: (event: MouseEvent<HTMLAnchorElement>) => void
}

function NavItem({ page, current, active, onJump }: ItemProps) {
  const here = current?.href === page.href
  const within = containsPage(page, current)
  return (
    <li className={styles.item}>
      <Link
        href={page.href}
        className={here ? `${styles.link} ${styles.current}` : styles.link}
        aria-current={here ? "page" : undefined}
        data-within={within && !here ? "" : undefined}
      >
        {page.label}
      </Link>
      {here && page.sections.length > 0 ? (
        <ul className={styles.sections} aria-label={`Sections of ${page.label}`}>
          {page.sections.map((section) => (
            <li key={section.id}>
              <a
                href={sectionHref(section)}
                className={styles.sectionLink}
                aria-current={active === section.id ? "location" : undefined}
                onClick={onJump}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {page.children === undefined || page.children.length === 0 ? null : (
        <ul className={styles.children}>
          {page.children.map((child) => (
            <NavItem
              key={child.href}
              page={child}
              current={current}
              active={active}
              onJump={onJump}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function RelatedGroup({ group }: { readonly group: DocsLinkGroup }) {
  const headingId = useId()
  return (
    <div className={styles.related}>
      <p className={styles.relatedTitle} id={headingId}>
        {group.label}
      </p>
      <ul className={styles.list} aria-labelledby={headingId}>
        {group.links.map((link) => (
          <li key={link.href} className={styles.item}>
            <Link href={link.href} className={styles.link}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DocsNav({ pages, related, label = "Documentation" }: DocsNavProps) {
  const pathname = usePathname()
  const current = pageAt(pages, pathname)
  const active = useActiveSection(current?.sections.map((section) => section.id) ?? [])
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (pathname !== null) {
      setOpen(false)
    }
  }, [pathname])

  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener("hashchange", close)
    return () => window.removeEventListener("hashchange", close)
  }, [])

  const onJump = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation()
    setOpen(false)
  }

  const activeLabel = current?.sections.find((section) => section.id === active)?.label ?? null

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && open) {
      setOpen(false)
      toggle.current?.focus()
    }
  }

  return (
    <nav className={styles.nav} aria-label={label} onKeyDown={onKeyDown}>
      <button
        ref={toggle}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Docs: ${current?.label ?? "Contents"}${activeLabel === null ? "" : ` · ${activeLabel}`}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.toggleLabel}>Docs</span>
        <span className={styles.toggleCurrent}>
          {current?.label ?? "Contents"}
          {activeLabel === null ? null : (
            <span className={styles.toggleSection}> · {activeLabel}</span>
          )}
        </span>
        <Chevron className={styles.toggleChevron} />
      </button>
      <div id={panelId} className={open ? `${styles.panel} ${styles.open}` : styles.panel}>
        <ul className={styles.list}>
          {pages.map((page) => (
            <NavItem
              key={page.href}
              page={page}
              current={current}
              active={active}
              onJump={onJump}
            />
          ))}
        </ul>
        {related === undefined ? null : <RelatedGroup group={related} />}
      </div>
    </nav>
  )
}
