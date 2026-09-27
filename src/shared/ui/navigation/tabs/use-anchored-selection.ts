"use client"

import { type RefObject, useCallback, useEffect, useRef, useState } from "react"
import { readReducedMotion } from "@/shared/ui/motion/use-reduced-motion"

function hashTarget(known: readonly string[]): string | null {
  const raw = globalThis.location?.hash.slice(1) ?? ""
  if (raw === "") {
    return null
  }
  const id = decodeURIComponent(raw)
  return known.includes(id) ? id : null
}

export function useAnchoredSelection(
  ids: readonly string[],
  initial: string,
  anchored: boolean,
  root: RefObject<HTMLElement | null>,
): readonly [string, (id: string) => void] {
  const [selected, setSelected] = useState(initial)
  const [arrivals, setArrivals] = useState(0)
  const reveal = useRef<string | null>(null)
  const key = ids.join(" ")

  useEffect(() => {
    if (!anchored) {
      return
    }
    const known = key.split(" ")
    const follow = () => {
      const id = hashTarget(known)
      if (id === null) {
        return
      }
      reveal.current = id
      setSelected(id)
      setArrivals((count) => count + 1)
    }
    follow()
    globalThis.addEventListener("hashchange", follow)
    globalThis.addEventListener("popstate", follow)
    return () => {
      globalThis.removeEventListener("hashchange", follow)
      globalThis.removeEventListener("popstate", follow)
    }
  }, [anchored, key])

  useEffect(() => {
    if (arrivals === 0 || reveal.current !== selected) {
      return
    }
    reveal.current = null
    const element = root.current
    if (element !== null && typeof element.scrollIntoView === "function") {
      element.scrollIntoView({
        block: "start",
        behavior: readReducedMotion() ? "auto" : "smooth",
      })
    }
  }, [selected, arrivals, root])

  const select = useCallback(
    (id: string) => {
      setSelected(id)
      const history = globalThis.history
      if (anchored && history !== undefined) {
        history.replaceState(history.state, "", `#${id}`)
      }
    },
    [anchored],
  )

  return [selected, select] as const
}
