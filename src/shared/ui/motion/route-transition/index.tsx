"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { REDUCED_MOTION_QUERY } from "../use-reduced-motion"

type Starter = (callback: () => void) => { readonly finished: Promise<void> }

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

function internalHref(anchor: HTMLAnchorElement): string | null {
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return null
  }
  const url = new URL(anchor.href, globalThis.location.href)
  if (url.origin !== globalThis.location.origin) {
    return null
  }
  return `${url.pathname}${url.search}${url.hash}`
}

function modified(event: globalThis.MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

export function RouteTransition() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const start = transitionStarter()
    if (start === null) {
      return
    }
    if (globalThis.window?.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true) {
      return
    }

    const onClick = (event: globalThis.MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a")
      if (!(anchor instanceof HTMLAnchorElement) || modified(event)) {
        return
      }
      const href = internalHref(anchor)
      if (href === null || href === `${pathname}${globalThis.location.search}`) {
        return
      }
      event.preventDefault()
      start(() => {
        router.push(href)
      })
    }

    globalThis.document.addEventListener("click", onClick)
    return () => {
      globalThis.document.removeEventListener("click", onClick)
    }
  }, [pathname, router])

  return null
}
