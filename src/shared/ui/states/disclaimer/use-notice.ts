"use client"

import { usePathname } from "next/navigation"
import {
  type FocusEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { placeSheet } from "./place-notice"

export const OPEN_DELAY_MS = 120

export const CLOSE_GRACE_MS = 220

type Reason = "hover" | "focus" | "click"

export type Notice = {
  readonly open: boolean
  readonly trigger: RefObject<HTMLButtonElement | null>
  readonly sheet: RefObject<HTMLDivElement | null>
  readonly triggerProps: {
    readonly onPointerEnter: (event: PointerEvent) => void
    readonly onPointerLeave: (event: PointerEvent) => void
    readonly onPointerDown: () => void
    readonly onFocus: () => void
    readonly onBlur: (event: FocusEvent) => void
    readonly onClick: () => void
  }
  readonly sheetProps: {
    readonly onPointerEnter: (event: PointerEvent) => void
    readonly onPointerLeave: (event: PointerEvent) => void
  }
}

function hovers(event: PointerEvent): boolean {
  return event.pointerType === "mouse" || event.pointerType === "pen"
}

export function useNotice(): Notice {
  const [open, setOpen] = useState(false)
  const reason = useRef<Reason | null>(null)
  const pressing = useRef(false)
  const overSheet = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const sheet = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const show = useCallback(
    (why: Reason) => {
      cancel()
      reason.current = why
      setOpen(true)
    },
    [cancel],
  )

  const hide = useCallback(() => {
    cancel()
    reason.current = null
    overSheet.current = false
    setOpen(false)
  }, [cancel])

  const later = useCallback(
    (action: () => void, delay: number) => {
      cancel()
      timer.current = setTimeout(() => {
        timer.current = null
        action()
      }, delay)
    },
    [cancel],
  )

  const enter = useCallback(
    (event: PointerEvent) => {
      if (!hovers(event)) {
        return
      }
      if (reason.current !== null) {
        cancel()
        return
      }
      later(() => show("hover"), OPEN_DELAY_MS)
    },
    [cancel, later, show],
  )

  const leave = useCallback(
    (event: PointerEvent) => {
      if (!hovers(event)) {
        return
      }
      if (reason.current === null) {
        cancel()
      } else if (reason.current === "hover") {
        later(hide, CLOSE_GRACE_MS)
      }
    },
    [cancel, later, hide],
  )

  const enterSheet = useCallback(
    (event: PointerEvent) => {
      overSheet.current = true
      enter(event)
    },
    [enter],
  )

  const leaveSheet = useCallback(
    (event: PointerEvent) => {
      overSheet.current = false
      leave(event)
    },
    [leave],
  )

  const onPointerDown = useCallback(() => {
    pressing.current = true
  }, [])

  const onFocus = useCallback(() => {
    const byPointer = pressing.current
    pressing.current = false
    if (!byPointer && reason.current === null) {
      show("focus")
    }
  }, [show])

  const onBlur = useCallback(
    (event: FocusEvent) => {
      const next = event.relatedTarget
      const inside = next instanceof Node && sheet.current?.contains(next) === true
      if (reason.current !== "hover" && !inside && !overSheet.current) {
        hide()
      }
    },
    [hide],
  )

  const onClick = useCallback(() => {
    pressing.current = false
    if (reason.current === "click") {
      hide()
    } else {
      show("click")
    }
  }, [hide, show])

  useLayoutEffect(() => {
    const node = sheet.current
    const anchor = trigger.current
    if (node === null || anchor === null) {
      return
    }
    const native = typeof node.showPopover === "function"
    if (!open) {
      if (native && node.matches(":popover-open")) {
        node.hidePopover()
      }
      return
    }
    if (native && !node.matches(":popover-open")) {
      node.showPopover()
    }
    placeSheet(anchor, node)
    const follow = () => placeSheet(anchor, node)
    globalThis.addEventListener("resize", follow)
    globalThis.addEventListener("scroll", follow, true)
    return () => {
      globalThis.removeEventListener("resize", follow)
      globalThis.removeEventListener("scroll", follow, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hide()
      }
    }
    const onDown = (event: globalThis.PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (trigger.current?.contains(target) || sheet.current?.contains(target)) {
        return
      }
      hide()
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onDown)
    }
  }, [open, hide])

  const shownOn = useRef(pathname)
  useEffect(() => {
    if (shownOn.current !== pathname) {
      shownOn.current = pathname
      hide()
    }
  }, [pathname, hide])

  useEffect(() => cancel, [cancel])

  return {
    open,
    trigger,
    sheet,
    triggerProps: {
      onPointerEnter: enter,
      onPointerLeave: leave,
      onPointerDown,
      onFocus,
      onBlur,
      onClick,
    },
    sheetProps: { onPointerEnter: enterSheet, onPointerLeave: leaveSheet },
  }
}
