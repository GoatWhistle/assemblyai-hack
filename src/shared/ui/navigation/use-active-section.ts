import { useEffect, useState } from "react"

export const SPY_ROOT_MARGIN = "0px 0px -65% 0px"

const BOTTOM_SLACK_PX = 4

function atPageBottom(): boolean {
  const root = globalThis.document?.documentElement
  if (root === undefined) {
    return false
  }
  return (
    globalThis.window.innerHeight + globalThis.window.scrollY >=
    root.scrollHeight - BOTTOM_SLACK_PX
  )
}

export function pickActive(
  order: readonly string[],
  visible: ReadonlySet<string>,
  bottom: boolean,
): string | null {
  if (bottom && order.length > 0) {
    return order.at(-1) ?? null
  }
  return order.find((id) => visible.has(id)) ?? null
}

export function useActiveSection(ids: readonly string[]): string | null {
  const key = ids.join(" ")
  const [active, setActive] = useState<string | null>(ids[0] ?? null)

  useEffect(() => {
    const order = key.split(" ").filter((id) => id.length > 0)
    setActive(order[0] ?? null)
    if (order.length === 0 || typeof globalThis.IntersectionObserver === "undefined") {
      return
    }
    const elements = order
      .map((id) => globalThis.document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
    if (elements.length === 0) {
      return
    }
    const visible = new Set<string>()
    const settle = () => {
      const next = pickActive(order, visible, atPageBottom())
      if (next !== null) {
        setActive(next)
      }
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id)
          } else {
            visible.delete(entry.target.id)
          }
        }
        settle()
      },
      { rootMargin: SPY_ROOT_MARGIN, threshold: 0 },
    )
    for (const element of elements) {
      observer.observe(element)
    }
    globalThis.window.addEventListener("scroll", settle, { passive: true })
    return () => {
      observer.disconnect()
      globalThis.window.removeEventListener("scroll", settle)
    }
  }, [key])

  return active
}
