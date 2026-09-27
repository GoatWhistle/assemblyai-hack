"use client"

import { type ReactNode, useLayoutEffect, useRef, useState } from "react"
import { motionMs } from "@/shared/ui/motion/motion-tokens"
import { readReducedMotion } from "@/shared/ui/motion/use-reduced-motion"
import type { FaultDetail } from "../../session-options"
import type { SessionFault } from "../../session-status"
import { BudgetPaused, FaultPanel } from "../fault-panel"
import { IntakePrompt } from "../intake-prompt"
import styles from "./styles.module.css"

export type SideNotice =
  | { readonly kind: "prompt" }
  | { readonly kind: "paused"; readonly detail: FaultDetail }
  | {
      readonly kind: "fault"
      readonly fault: SessionFault
      readonly detail: FaultDetail | null
      readonly canRestart: boolean
    }

function keyOf(notice: SideNotice | null): string {
  if (notice === null) {
    return "none"
  }
  return notice.kind === "fault" ? `fault:${notice.fault}` : notice.kind
}

function render(notice: SideNotice | null, onStart: (() => void) | undefined): ReactNode {
  if (notice === null) {
    return null
  }
  if (notice.kind === "prompt") {
    return <IntakePrompt />
  }
  if (notice.kind === "paused") {
    return <BudgetPaused detail={notice.detail} />
  }
  return (
    <FaultPanel
      fault={notice.fault}
      faultDetail={notice.detail}
      canRestart={notice.canRestart}
      onStart={onStart}
    />
  )
}

export type CallNoticeProps = {
  readonly notice: SideNotice | null
  readonly className?: string
  readonly onStart?: (() => void) | undefined
}

export function CallNotice({ notice, className, onStart }: CallNoticeProps) {
  const slotKey = keyOf(notice)
  const [shownKey, setShownKey] = useState(slotKey)
  const [swapped, setSwapped] = useState(false)
  const held = useRef<{ kind: string; content: ReactNode }>({
    kind: notice?.kind ?? "none",
    content: render(notice, onStart),
  })
  const element = useRef<HTMLDivElement | null>(null)
  const current = slotKey === shownKey
  const fresh = { kind: notice?.kind ?? "none", content: render(notice, onStart) }

  useLayoutEffect(() => {
    if (current) {
      held.current = fresh
    }
  })

  useLayoutEffect(() => {
    if (current) {
      return undefined
    }
    const finish = () => {
      setShownKey(slotKey)
      setSwapped(true)
    }
    const node = element.current
    const wait = motionMs("--dur-base")
    if (node === null || readReducedMotion() || wait <= 1) {
      finish()
      return undefined
    }
    node.dataset.leaving = ""
    const done = (event: AnimationEvent) => {
      if (event.target === node) {
        finish()
      }
    }
    node.addEventListener("animationend", done)
    const fallback = globalThis.setTimeout(finish, wait * 2)
    return () => {
      node.removeEventListener("animationend", done)
      globalThis.clearTimeout(fallback)
      delete node.dataset.leaving
    }
  }, [current, slotKey])

  const shown = current ? fresh : held.current
  if (shown.content === null) {
    return null
  }
  const arriving = shown.kind !== "prompt" || swapped
  const classes = [className, styles.slot, arriving ? styles.arrive : undefined]
    .filter(Boolean)
    .join(" ")
  return (
    <div key={shownKey} ref={element} className={classes} data-kind={shown.kind}>
      {shown.content}
    </div>
  )
}
