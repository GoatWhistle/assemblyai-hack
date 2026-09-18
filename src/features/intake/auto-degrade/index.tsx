"use client"

import { useCallback, useEffect, useState } from "react"
import { useReducedMotion } from "@/shared/ui/motion/use-reduced-motion"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Button } from "@/shared/ui/primitives/button"
import { isMicrophoneFault, type SessionFault } from "../session-status"
import styles from "./styles.module.css"

export const AUTO_DEGRADE_SECONDS = 8
export const AUTO_DEGRADE_TARGET = "/demo"

export type AutoDegradeProps = {
  readonly fault: SessionFault | null
  readonly onNavigate?: (target: string) => void
}

export function AutoDegrade({ fault, onNavigate }: AutoDegradeProps) {
  const reduced = useReducedMotion()
  const active = isMicrophoneFault(fault)
  const [remaining, setRemaining] = useState(AUTO_DEGRADE_SECONDS)
  const [cancelled, setCancelled] = useState(false)

  const leave = useCallback(() => {
    if (onNavigate !== undefined) {
      onNavigate(AUTO_DEGRADE_TARGET)
      return
    }
    globalThis.window?.location.assign(AUTO_DEGRADE_TARGET)
  }, [onNavigate])

  useEffect(() => {
    if (!active || cancelled) {
      return
    }
    const timer = globalThis.window?.setTimeout(() => {
      if (remaining <= 1) {
        leave()
        return
      }
      setRemaining((previous) => previous - 1)
    }, 1000)
    return () => {
      if (timer !== undefined) {
        globalThis.window?.clearTimeout(timer)
      }
    }
  }, [active, cancelled, remaining, leave])

  if (!active || cancelled) {
    return null
  }

  return (
    <div className={[styles.wrap, reduced ? styles.still : styles.animated].join(" ")}>
      <output className={styles.note} aria-live="polite">
        Moving to the recorded demonstration in {remaining}s. That demonstration is a recorded
        session, clearly labelled as recorded, never presented as live.
      </output>
      <div className={styles.actions}>
        <ActionLink href={AUTO_DEGRADE_TARGET} size="large">
          Watch it now
        </ActionLink>
        <Button onClick={() => setCancelled(true)}>Stay here</Button>
      </div>
    </div>
  )
}
