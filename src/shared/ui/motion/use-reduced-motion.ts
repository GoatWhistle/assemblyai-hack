import { useSyncExternalStore } from "react"

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export function readReducedMotion(): boolean {
  return globalThis.window?.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true
}

function subscribe(onChange: () => void): () => void {
  const media = globalThis.window?.matchMedia?.(REDUCED_MOTION_QUERY)
  if (media === undefined || media === null) {
    return () => undefined
  }
  media.addEventListener("change", onChange)
  return () => {
    media.removeEventListener("change", onChange)
  }
}

function serverSnapshot(): boolean {
  return false
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, readReducedMotion, serverSnapshot)
}
