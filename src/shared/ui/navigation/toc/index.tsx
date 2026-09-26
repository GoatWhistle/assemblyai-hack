"use client"

import { usePathname } from "next/navigation"
import { type MouseEvent, useId } from "react"
import { type DocsPage, pageAt, sectionHref } from "../docs-tree"
import { useActiveSection } from "../use-active-section"
import styles from "./styles.module.css"

export const TOC_TITLE = "On this page"

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

  if (sections.length < 2) {
    return null
  }

  return (
    <nav className={styles.toc} aria-labelledby={titleId}>
      <p className={styles.title} id={titleId}>
        {title}
      </p>
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
    </nav>
  )
}
