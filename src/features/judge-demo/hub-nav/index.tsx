"use client"

import { useEffect, useState } from "react"
import styles from "./styles.module.css"

export type HubSection = {
  readonly id: string
  readonly label: string
}

export type HubNavProps = {
  readonly sections: readonly HubSection[]
}

const SPY_MARGIN = "-20% 0px -65% 0px"

export function HubNav({ sections }: HubNavProps) {
  const [current, setCurrent] = useState<string | null>(null)

  useEffect(() => {
    const Observer = globalThis.IntersectionObserver
    if (Observer === undefined) {
      return
    }
    const observer = new Observer(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (visible !== undefined) {
          setCurrent(visible.target.id)
        }
      },
      { rootMargin: SPY_MARGIN },
    )
    for (const section of sections) {
      const element = document.getElementById(section.id)
      if (element !== null) {
        observer.observe(element)
      }
    }
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav className={styles.nav} aria-label="On this page">
      <ul className={styles.list}>
        {sections.map((section) => (
          <li key={section.id} className={styles.item}>
            <a
              className={styles.link}
              href={`#${section.id}`}
              aria-current={current === section.id ? "location" : undefined}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
