import { useEffect, useState } from "react"

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export function readReducedMotion(): boolean {
  return globalThis.window?.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readReducedMotion)

  useEffect(() => {
    const media = globalThis.window?.matchMedia?.(REDUCED_MOTION_QUERY)
    if (media === undefined || media === null) {
      return
    }
    setReduced(media.matches)
    const listen = (event: MediaQueryListEvent) => {
      setReduced(event.matches)
    }
    media.addEventListener("change", listen)
    return () => {
      media.removeEventListener("change", listen)
    }
  }, [])

  return reduced
}
