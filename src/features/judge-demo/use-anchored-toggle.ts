import { type RefObject, useEffect, useRef } from "react"

export function useAnchoredToggle<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const root = ref.current
    if (root === null) {
      return
    }
    const onClick = (event: MouseEvent) => {
      const summary = event.target instanceof Element ? event.target.closest("summary") : null
      if (summary === null || !root.contains(summary)) {
        return
      }
      const before = summary.getBoundingClientRect().top
      globalThis.requestAnimationFrame?.(() => {
        const shift = summary.getBoundingClientRect().top - before
        if (Math.abs(shift) > 1) {
          globalThis.scrollBy?.(0, shift)
        }
      })
    }
    root.addEventListener("click", onClick, true)
    return () => {
      root.removeEventListener("click", onClick, true)
    }
  }, [])

  return ref
}
