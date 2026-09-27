"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { readReducedMotion } from "@/shared/ui/motion/use-reduced-motion"

export const ARRIVAL_ATTRIBUTE = "data-arrival"

export const ARRIVAL_HOLD_MS = 1600

export const ARRIVAL_IDLE_MS = 160

export const ARRIVAL_QUIET_MS = 120

export const ARRIVAL_LIMIT_MS = 2400

export function samePageFragment(
  anchor: HTMLAnchorElement,
  location: Pick<Location, "origin" | "pathname" | "search" | "href">,
): string | null {
  const raw = anchor.getAttribute("href")
  if (raw === null || !raw.includes("#")) {
    return null
  }
  if (anchor.target !== "" && anchor.target !== "_self") {
    return null
  }
  const url = new URL(anchor.href, location.href)
  if (
    url.origin !== location.origin ||
    url.pathname !== location.pathname ||
    url.search !== location.search
  ) {
    return null
  }
  const id = decodeURIComponent(url.hash.slice(1))
  return id.length > 0 ? id : null
}

export function arrivalMark(target: HTMLElement): HTMLElement {
  if (/^H[1-6]$/.test(target.tagName)) {
    return target
  }
  const labelled = target.getAttribute("aria-labelledby")?.split(" ")[0]
  const label = labelled === undefined ? null : target.ownerDocument.getElementById(labelled)
  if (label !== null && target.contains(label)) {
    return label
  }
  return target.querySelector<HTMLElement>("h2, h3, h4, dt") ?? target
}

export function whenSettled(done: () => void): () => void {
  const view = globalThis.window
  let quiet: ReturnType<typeof setTimeout> | undefined
  const stop = () => {
    globalThis.clearTimeout(idle)
    globalThis.clearTimeout(limit)
    globalThis.clearTimeout(quiet)
    view.removeEventListener("scroll", onScroll)
    view.removeEventListener("scrollend", finish)
  }
  const finish = () => {
    stop()
    done()
  }
  const onScroll = () => {
    globalThis.clearTimeout(idle)
    globalThis.clearTimeout(quiet)
    quiet = globalThis.setTimeout(finish, ARRIVAL_QUIET_MS)
  }
  const idle = globalThis.setTimeout(finish, ARRIVAL_IDLE_MS)
  const limit = globalThis.setTimeout(finish, ARRIVAL_LIMIT_MS)
  view.addEventListener("scroll", onScroll, { passive: true })
  view.addEventListener("scrollend", finish)
  return stop
}

function mark(element: HTMLElement): () => void {
  element.removeAttribute(ARRIVAL_ATTRIBUTE)
  element.getBoundingClientRect()
  element.setAttribute(ARRIVAL_ATTRIBUTE, "")
  const timer = globalThis.setTimeout(
    () => element.removeAttribute(ARRIVAL_ATTRIBUTE),
    ARRIVAL_HOLD_MS,
  )
  return () => {
    globalThis.clearTimeout(timer)
    element.removeAttribute(ARRIVAL_ATTRIBUTE)
  }
}

function focusQuietly(element: HTMLElement) {
  if (!element.hasAttribute("tabindex") && element.tabIndex < 0) {
    element.setAttribute("tabindex", "-1")
  }
  element.focus({ preventScroll: true })
}

export function glideScroll(): () => void {
  const root = globalThis.document.documentElement
  if (readReducedMotion()) {
    return () => undefined
  }
  root.style.scrollBehavior = "smooth"
  return () => {
    root.style.removeProperty("scroll-behavior")
  }
}

function halt() {
  globalThis.window.scrollTo({ top: globalThis.scrollY, behavior: "instant" })
}

function targetIn(main: HTMLElement | null, id: string): HTMLElement | null {
  const target = globalThis.document.getElementById(id)
  if (main === null || target === null || target === main || !main.contains(target)) {
    return null
  }
  return target
}

export type AnchorArrivalProps = {
  readonly mainId: string
}

export function AnchorArrival({ mainId }: AnchorArrivalProps) {
  const pathname = usePathname()

  useEffect(() => {
    let cancel: () => void = () => undefined
    let gliding = false
    const arrive = (target: HTMLElement, focus: boolean, glide: boolean) => {
      cancel()
      const element = arrivalMark(target)
      let unmark: () => void = () => undefined
      const release = glide ? glideScroll() : () => undefined
      gliding = glide
      const stop = whenSettled(() => {
        gliding = false
        release()
        if (focus) {
          focusQuietly(element)
        }
        unmark = mark(element)
      })
      cancel = () => {
        stop()
        release()
        if (gliding) {
          gliding = false
          halt()
        }
        unmark()
      }
    }

    const onClick = (event: globalThis.MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) {
        return
      }
      const anchor = (event.target as Element | null)?.closest?.("a")
      if (!(anchor instanceof HTMLAnchorElement)) {
        return
      }
      const id = samePageFragment(anchor, globalThis.location)
      const target = id === null ? null : targetIn(document.getElementById(mainId), id)
      if (target !== null) {
        arrive(target, true, true)
      }
    }

    const hash = decodeURIComponent(globalThis.location.hash.slice(1))
    const landed =
      pathname !== null && hash.length > 0
        ? targetIn(document.getElementById(mainId), hash)
        : null
    if (landed !== null) {
      arrive(landed, false, false)
    }

    globalThis.window.addEventListener("click", onClick, { capture: true })
    return () => {
      globalThis.window.removeEventListener("click", onClick, { capture: true })
      cancel()
    }
  }, [mainId, pathname])

  return null
}
