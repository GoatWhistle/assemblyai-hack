"use client"

import { useCallback, useEffect, useState } from "react"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Button } from "@/shared/ui/primitives/button"
import { degradesToReplay, type SessionFault } from "../session-status"
import styles from "./styles.module.css"

export const AUTO_DEGRADE_SECONDS = 8
export const AUTO_DEGRADE_TARGET = REPLAY_ENTRY_HREF

export type AutoDegradeProps = {
  readonly fault: SessionFault | null
  readonly onNavigate?: (target: string) => void
}

export function AutoDegrade({ fault, onNavigate }: AutoDegradeProps) {
  const active = degradesToReplay(fault)
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

  if (!active) {
    return null
  }

  return (
    <div className={styles.wrap}>
      {cancelled ? null : (
        <output className={styles.note} aria-live="polite">
          Moving to the replay demonstration in {remaining}s. It replays a synthesised session,
          clearly labelled as a replay, never presented as live.
        </output>
      )}
      <div className={styles.actions}>
        <ActionLink href={AUTO_DEGRADE_TARGET} tone="primary">
          Watch it now
        </ActionLink>
        {cancelled ? null : <Button onClick={() => setCancelled(true)}>Stay here</Button>}
      </div>
    </div>
  )
}
