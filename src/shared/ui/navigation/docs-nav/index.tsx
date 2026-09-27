"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type KeyboardEvent, type MouseEvent, useEffect, useId, useRef, useState } from "react"
import { useGlideMarker } from "@/shared/ui/motion/use-glide"
import { Chevron } from "../chevron"
import { containsPage, type DocsPage, pageAt, sectionHref } from "../docs-tree"
import { useActiveSection } from "../use-active-section"
import styles from "./styles.module.css"

export type DocsNavProps = {
  readonly pages: readonly DocsPage[]
  readonly label?: string
}

const CURRENT_PAGE = '[aria-current="page"]'

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

export function DocsNav({ pages, label = "Documentation" }: DocsNavProps) {
  const pathname = usePathname()
  const current = pageAt(pages, pathname)
  const active = useActiveSection(current?.sections.map((section) => section.id) ?? [])
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const toggle = useRef<HTMLButtonElement>(null)
  const root = useRef<HTMLElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLSpanElement>(null)
  useGlideMarker(rail, marker, CURRENT_PAGE, current?.href ?? null)

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

  useEffect(() => {
    if (!open) {
      return
    }
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target) !== true) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onOutside)
    return () => document.removeEventListener("pointerdown", onOutside)
  }, [open])

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
    <nav ref={root} className={styles.nav} aria-label={label} onKeyDown={onKeyDown}>
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
        <div className={styles.rail} ref={rail}>
          <span className={styles.marker} ref={marker} aria-hidden="true" />
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
        </div>
      </div>
    </nav>
  )
}
