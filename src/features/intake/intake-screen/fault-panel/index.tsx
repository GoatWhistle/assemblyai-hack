"use client"

import { useEffect, useId, useRef } from "react"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { readReducedMotion } from "@/shared/ui/motion/use-reduced-motion"
import { Chevron } from "@/shared/ui/navigation/chevron"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Button } from "@/shared/ui/primitives/button"
import { AutoDegrade } from "../../auto-degrade"
import type { FaultDetail } from "../../session-options"
import { degradesToReplay, FAULT_COPY, type SessionFault } from "../../session-status"
import styles from "./styles.module.css"

export const REPLAY_ACTION_LABEL = "Watch the replay"

function asSentence(text: string): string {
  const trimmed = text.trim()
  const opened = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(opened) ? opened : `${opened}.`
}

export type FaultPanelProps = {
  readonly fault: SessionFault
  readonly faultDetail?: FaultDetail | null
  readonly canRestart?: boolean
  readonly onStart?: (() => void) | undefined
}

export function FaultPanel({
  fault,
  faultDetail = null,
  canRestart = true,
  onStart,
}: FaultPanelProps) {
  const copy = FAULT_COPY[fault]
  const titleId = useId()
  const card = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const spent = degradesToReplay(fault)
  const detailShown = spent && faultDetail !== null

  useEffect(() => {
    if (!canRestart) {
      return
    }
    const behavior = readReducedMotion() ? "auto" : "smooth"
    card.current?.scrollIntoView?.({ block: "nearest", behavior })
    heading.current?.focus({ preventScroll: true })
  }, [canRestart])

  return (
    <div className={styles.fault} role="alert" aria-labelledby={titleId} ref={card}>
      <h2 className={styles.title} id={titleId} ref={heading} tabIndex={-1}>
        {copy.title}
      </h2>
      <p className={styles.body}>{copy.body}</p>
      {detailShown ? <p className={styles.body}>{asSentence(faultDetail.message)}</p> : null}
      <div className={styles.remedy}>
        <p className={styles.remedyLabel}>What to do</p>
        <p className={styles.remedyText}>{copy.remedy}</p>
      </div>
      {spent ? <AutoDegrade key={fault} fault={fault} /> : null}
      {canRestart && !spent ? (
        <div className={styles.actions}>
          <Button tone="primary" onClick={onStart}>
            Try again
          </Button>
          <ActionLink href={REPLAY_ENTRY_HREF}>{REPLAY_ACTION_LABEL}</ActionLink>
        </div>
      ) : null}
      <details className={styles.technical}>
        <summary className={styles.technicalSummary}>
          Technical reason
          <Chevron className={styles.chevron} />
        </summary>
        <p className={styles.technicalBody}>
          Reported as <code>{fault}</code>
          {faultDetail === null ? "." : ", with "}
          {faultDetail === null ? null : <code>{faultDetail.code}</code>}
          {faultDetail === null || detailShown ? null : `: ${faultDetail.message}`}
        </p>
      </details>
    </div>
  )
}
