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
  const detailShown = spent && faultDetail !== null && copy.lead === undefined

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
      <p className={styles.body}>{copy.lead ?? copy.body}</p>
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
        {copy.lead === undefined ? null : <p className={styles.technicalBody}>{copy.body}</p>}
        {copy.lead === undefined || faultDetail === null ? null : (
          <p className={styles.technicalBody}>{asSentence(faultDetail.message)}</p>
        )}
        <p className={styles.technicalBody}>
          Reported as <code>{fault}</code>
          {faultDetail === null ? "." : ", with "}
          {faultDetail === null ? null : <code>{faultDetail.code}</code>}
          {faultDetail === null || spent ? null : `: ${faultDetail.message}`}
        </p>
      </details>
    </div>
  )
}

export const PAUSED_TITLE = "Live calls are paused for today"

export const PAUSED_BODY =
  "The daily live-call budget is spent, so the microphone stays off until it resets at 00:00 UTC. Nothing is billed to you, and the replay needs no call."

export type BudgetPausedProps = {
  readonly detail: FaultDetail
}

export function BudgetPaused({ detail }: BudgetPausedProps) {
  const titleId = useId()
  return (
    <section className={`${styles.fault} ${styles.paused}`} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        {PAUSED_TITLE}
      </h2>
      <p className={styles.body}>{PAUSED_BODY}</p>
      <div className={styles.actions}>
        <ActionLink href={REPLAY_ENTRY_HREF} tone="primary">
          Watch the replay
        </ActionLink>
      </div>
      <details className={styles.technical}>
        <summary className={styles.technicalSummary}>
          Technical reason
          <Chevron className={styles.chevron} />
        </summary>
        <p className={styles.technicalBody}>
          Read before any call from the budget route, reported as <code>{detail.code}</code>:{" "}
          {detail.message}
        </p>
      </details>
    </section>
  )
}
