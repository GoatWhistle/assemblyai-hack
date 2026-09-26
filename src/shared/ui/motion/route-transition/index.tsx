"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useLayoutEffect, useRef } from "react"
import { REDUCED_MOTION_QUERY } from "../use-reduced-motion"

type Starter = (callback: () => Promise<void>) => { readonly finished: Promise<void> }

export const ROUTE_RENDER_WAIT_MS = 300

export const NO_TRANSITION_ATTRIBUTE = "data-no-transition"

function transitionStarter(): Starter | null {
  const target = globalThis.document as Document & {
    startViewTransition?: Starter
  }
  const start = target?.startViewTransition
  if (typeof start !== "function") {
    return null
  }
  return start.bind(target) as Starter
}

function modified(event: globalThis.MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

export function transitionTarget(
  anchor: HTMLAnchorElement,
  location: Pick<Location, "origin" | "pathname" | "href">,
): string | null {
  if (anchor.hasAttribute("download") || anchor.hasAttribute(NO_TRANSITION_ATTRIBUTE)) {
    return null
  }
  if (anchor.target !== "" && anchor.target !== "_self") {
    return null
  }
  const raw = anchor.getAttribute("href")
  if (raw === null || raw.startsWith("#")) {
    return null
  }
  const url = new URL(anchor.href, location.href)
  if (url.origin !== location.origin || url.pathname === location.pathname) {
    return null
  }
  return `${url.pathname}${url.search}${url.hash}`
}

export function RouteTransition() {
  const router = useRouter()
  const pathname = usePathname()
  const pending = useRef<(() => void) | null>(null)
  const shown = useRef(pathname)

  useLayoutEffect(() => {
    if (shown.current === pathname) {
      return
    }
    shown.current = pathname
    const resolve = pending.current
    pending.current = null
    resolve?.()
  }, [pathname])

  useEffect(() => {
    const start = transitionStarter()
    if (start === null) {
      return
    }
    if (globalThis.window?.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true) {
      return
    }

    const onClick = (event: globalThis.MouseEvent) => {
      if (event.defaultPrevented || modified(event)) {
        return
      }
      const anchor = (event.target as Element | null)?.closest?.("a")
      if (!(anchor instanceof HTMLAnchorElement)) {
        return
      }
      const href = transitionTarget(anchor, globalThis.location)
      if (href === null) {
        return
      }
      event.preventDefault()
      start(
        () =>
          new Promise<void>((resolve) => {
            const timer = globalThis.setTimeout(resolve, ROUTE_RENDER_WAIT_MS)
            pending.current = () => {
              globalThis.clearTimeout(timer)
              resolve()
            }
            router.push(href)
          }),
      )
    }

    globalThis.window.addEventListener("click", onClick, { capture: true })
    return () => {
      globalThis.window.removeEventListener("click", onClick, { capture: true })
    }
  }, [router])

  return null
}
