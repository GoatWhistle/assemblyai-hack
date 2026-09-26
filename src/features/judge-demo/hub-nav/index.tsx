"use client"

import { useEffect, useRef, useState } from "react"
import { REDUCED_MOTION_QUERY } from "@/shared/ui/motion/use-reduced-motion"
import { activeHubSection } from "./active-hub"
import styles from "./styles.module.css"

export type HubSection = {
  readonly id: string
  readonly label: string
}

export type HubNavProps = {
  readonly sections: readonly HubSection[]
}

const SPY_LINE_FRACTION = 0.3
const BOTTOM_SLACK_PX = 4

function measure(ids: readonly string[]): string | null {
  const view = globalThis.window
  const root = globalThis.document?.documentElement
  if (view === undefined || root === undefined) {
    return null
  }
  const boxes = ids.flatMap((id) => {
    const element = globalThis.document.getElementById(id)
    return element === null ? [] : [{ id, top: element.getBoundingClientRect().top }]
  })
  const atBottom = view.innerHeight + view.scrollY >= root.scrollHeight - BOTTOM_SLACK_PX
  return activeHubSection(boxes, view.innerHeight * SPY_LINE_FRACTION, atBottom)
}

export function HubNav({ sections }: HubNavProps) {
  const [current, setCurrent] = useState<string | null>(null)
  const list = useRef<HTMLUListElement | null>(null)
  const key = sections.map((section) => section.id).join(" ")

  useEffect(() => {
    const view = globalThis.window
    if (view === undefined) {
      return
    }
    const ids = key.split(" ")
    let frame = 0
    const update = () => {
      frame = 0
      setCurrent(measure(ids))
    }
    const schedule = () => {
      if (frame === 0) {
        frame = view.requestAnimationFrame(update)
      }
    }
    update()
    view.addEventListener("scroll", schedule, { passive: true })
    view.addEventListener("resize", schedule)
    return () => {
      view.removeEventListener("scroll", schedule)
      view.removeEventListener("resize", schedule)
      if (frame !== 0) {
        view.cancelAnimationFrame(frame)
      }
    }
  }, [key])

  useEffect(() => {
    const strip = list.current
    if (strip === null || current === null || strip.scrollWidth <= strip.clientWidth) {
      return
    }
    const link = strip.querySelector<HTMLElement>(`a[href="#${current}"]`)
    const reduced = globalThis.window?.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true
    if (link !== null) {
      strip.scrollTo({
        left: link.offsetLeft - (strip.clientWidth - link.offsetWidth) / 2,
        behavior: reduced ? "auto" : "smooth",
      })
    }
  }, [current])

  return (
    <nav className={styles.nav} aria-label="On this page">
      <ul className={styles.list} ref={list}>
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
