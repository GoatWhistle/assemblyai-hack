"use client"

import { usePathname } from "next/navigation"
import { type MouseEvent, useId, useRef } from "react"
import { useGlideMarker } from "@/shared/ui/motion/use-glide"
import { type DocsPage, pageAt, sectionHref } from "../docs-tree"
import { useActiveSection } from "../use-active-section"
import styles from "./styles.module.css"

export const TOC_TITLE = "On this page"

const ACTIVE_ENTRY = '[aria-current="location"]'

export type TocProps = {
  readonly pages: readonly DocsPage[]
  readonly title?: string
}

function keepNativeJump(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation()
}

export function Toc({ pages, title = TOC_TITLE }: TocProps) {
  const current = pageAt(pages, usePathname())
  const sections = current?.sections ?? []
  const active = useActiveSection(sections.map((section) => section.id))
  const titleId = useId()
  const rail = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLSpanElement>(null)
  useGlideMarker(rail, marker, ACTIVE_ENTRY, active)

  if (sections.length < 2) {
    return null
  }

  return (
    <nav className={styles.toc} aria-labelledby={titleId}>
      <p className={styles.title} id={titleId}>
        {title}
      </p>
      <div className={styles.rail} ref={rail}>
        <span className={styles.marker} ref={marker} aria-hidden="true" />
        <ol className={styles.list}>
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={sectionHref(section)}
                className={styles.link}
                aria-current={active === section.id ? "location" : undefined}
                onClick={keepNativeJump}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
