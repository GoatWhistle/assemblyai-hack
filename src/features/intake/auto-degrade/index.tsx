"use client"

import { useCallback, useEffect, useState } from "react"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { useReducedMotion } from "@/shared/ui/motion/use-reduced-motion"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Button } from "@/shared/ui/primitives/button"
import { degradesToReplay, SessionFault } from "../session-status"
import styles from "./styles.module.css"

export const AUTO_DEGRADE_SECONDS = 8
export const AUTO_DEGRADE_TARGET = REPLAY_ENTRY_HREF

const MICROPHONE_REASON = "No microphone could be opened here."

const DEGRADE_REASON: Readonly<Partial<Record<SessionFault, string>>> = Object.freeze({
  [SessionFault.MicrophoneDenied]: MICROPHONE_REASON,
  [SessionFault.MicrophoneAbsent]: MICROPHONE_REASON,
  [SessionFault.MicrophoneBusy]: MICROPHONE_REASON,
  [SessionFault.InsecureContext]: MICROPHONE_REASON,
  [SessionFault.TokenFailed]:
    "The server did not issue a token, so no socket was opened and nothing was billed.",
  [SessionFault.CreditsExhausted]:
    "The project's AssemblyAI account is out of credit. Live calls spend the project's credit, never yours.",
  [SessionFault.BudgetExhausted]:
    "A live-call budget cap refused this call. Live calls spend the project's own credit, never yours, under a daily cap and a per-visitor share so one visitor cannot use it up for everyone.",
})

export type AutoDegradeProps = {
  readonly fault: SessionFault | null
  readonly onNavigate?: (target: string) => void
}

export function AutoDegrade({ fault, onNavigate }: AutoDegradeProps) {
  const reduced = useReducedMotion()
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

  if (!active || cancelled) {
    return null
  }

  return (
    <div className={[styles.wrap, reduced ? styles.still : styles.animated].join(" ")}>
      <output className={styles.note} aria-live="polite">
        {fault === null ? null : <span className={styles.reason}>{DEGRADE_REASON[fault]}</span>}
        Moving to the replay demonstration in {remaining}s. It replays a synthesised session,
        clearly labelled as a replay, never presented as live.
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
