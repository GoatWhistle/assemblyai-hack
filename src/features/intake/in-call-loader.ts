"use client"

import { useEffect, useState } from "react"

export type InCallModule = typeof import("./in-call")

let loaded: InCallModule | null = null
let pending: Promise<InCallModule> | null = null

export function preloadInCall(): Promise<InCallModule> {
  if (loaded !== null) {
    return Promise.resolve(loaded)
  }
  pending ??= import("./in-call").then((module) => {
    loaded = module
    return module
  })
  return pending
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number
  cancelIdleCallback?: (handle: number) => void
}

export function useInCall(eager: boolean): InCallModule | null {
  const [module, setModule] = useState<InCallModule | null>(loaded)

  useEffect(() => {
    if (module !== null) {
      return
    }
    let live = true
    const load = () => {
      void preloadInCall().then((ready) => {
        if (live) {
          setModule(ready)
        }
      })
    }
    if (eager) {
      load()
      return () => {
        live = false
      }
    }
    const view = globalThis.window as IdleWindow | undefined
    if (view?.requestIdleCallback !== undefined) {
      const handle = view.requestIdleCallback(load)
      return () => {
        live = false
        view.cancelIdleCallback?.(handle)
      }
    }
    const timer = globalThis.setTimeout(load, 0)
    return () => {
      live = false
      globalThis.clearTimeout(timer)
    }
  }, [module, eager])

  return module
}
