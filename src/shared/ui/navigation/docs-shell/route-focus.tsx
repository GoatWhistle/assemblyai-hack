"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

export type RouteFocusProps = {
  readonly mainId: string
}

export function RouteFocus({ mainId }: RouteFocusProps) {
  const pathname = usePathname()
  const previous = useRef(pathname)

  useEffect(() => {
    if (previous.current === pathname) {
      return
    }
    previous.current = pathname
    const main = document.getElementById(mainId)
    const heading = main?.querySelector<HTMLElement>("h1") ?? null
    const target = heading ?? main
    if (target === null) {
      return
    }
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1")
    }
    target.focus({ preventScroll: true })
  }, [pathname, mainId])

  return null
}
