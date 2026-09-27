"use client"

import { type ReactNode, type Ref, useEffect, useId, useRef } from "react"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { useDetailsMotion } from "@/shared/ui/motion/use-details-motion"
import { readReducedMotion } from "@/shared/ui/motion/use-reduced-motion"
import { Chevron } from "@/shared/ui/navigation/chevron"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Button } from "@/shared/ui/primitives/button"
import { Panel, type PanelTone } from "@/shared/ui/primitives/panel"
import { headingClass } from "@/shared/ui/typography/heading"
import { AutoDegrade } from "../../auto-degrade"
import { FAULT_STEPS } from "../../fault-steps"
import type { FaultDetail } from "../../session-options"
import { degradesToReplay, FAULT_COPY, type SessionFault } from "../../session-status"
import { FaultGlyph, glyphFor, type NoticeGlyph } from "./glyphs"
import styles from "./styles.module.css"

export const RETRY_ACTION_LABEL = "Try again"

function asSentence(text: string): string {
  const trimmed = text.trim()
  const opened = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(opened) ? opened : `${opened}.`
}

export function splitCause(body: string): { readonly cause: string; readonly rest: string } {
  const at = body.search(/[.!?]\s+(?=[A-Z])/)
  return at < 0
    ? { cause: body, rest: "" }
    : { cause: body.slice(0, at + 1), rest: body.slice(at + 1).trim() }
}

function TechnicalReason({ children }: { readonly children: ReactNode }) {
  const ref = useDetailsMotion()
  return (
    <details className={styles.technical} ref={ref}>
      <summary className={styles.technicalSummary}>
        Technical reason
        <Chevron className={styles.chevron} />
      </summary>
      <div className={styles.technicalBody}>{children}</div>
    </details>
  )
}

type NoticeCardProps = {
  readonly glyph: NoticeGlyph
  readonly tone: PanelTone
  readonly title: string
  readonly titleId: string
  readonly titleRef?: Ref<HTMLHeadingElement>
  readonly alarmed?: boolean
  readonly children: ReactNode
}

function NoticeCard({
  glyph,
  tone,
  title,
  titleId,
  titleRef,
  alarmed = false,
  children,
}: NoticeCardProps) {
  return (
    <Panel as="div" tone={tone}>
      <div className={styles.card} data-glyph={glyph} data-alarmed={alarmed ? "" : undefined}>
        <span className={styles.glyph} aria-hidden="true">
          <FaultGlyph glyph={glyph} />
        </span>
        <h2
          className={`${headingClass("block")} ${styles.title}`}
          data-rank="block"
          id={titleId}
          ref={titleRef}
          tabIndex={titleRef === undefined ? undefined : -1}
        >
          {title}
        </h2>
        <div className={styles.content}>{children}</div>
      </div>
    </Panel>
  )
}

function Steps({ fault }: { readonly fault: SessionFault }) {
  const { steps, note } = FAULT_STEPS[fault]
  return (
    <div className={styles.remedy}>
      <p className={styles.remedyLabel}>What to do</p>
      {steps.length > 1 ? (
        <ol className={styles.steps}>
          {steps.map((step) => (
            <li key={step} className={styles.step}>
              {step}
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.single}>{steps[0]}</p>
      )}
      {note === undefined ? null : <p className={styles.note}>{note}</p>}
    </div>
  )
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
  const heading = useRef<HTMLHeadingElement>(null)
  const spent = degradesToReplay(fault)
  const { cause, rest } =
    copy.lead === undefined ? splitCause(copy.body) : { cause: copy.lead, rest: copy.body }

  useEffect(() => {
    if (!canRestart) {
      return
    }
    const behavior = readReducedMotion() ? "auto" : "smooth"
    heading.current?.scrollIntoView?.({ block: "nearest", behavior })
    heading.current?.focus({ preventScroll: true })
  }, [canRestart])

  return (
    <div className={styles.notice} role="alert" aria-labelledby={titleId}>
      <NoticeCard
        glyph={glyphFor(fault)}
        tone="tinted"
        alarmed
        title={copy.title}
        titleId={titleId}
        titleRef={heading}
      >
        <p className={styles.cause}>{cause}</p>
        <Steps fault={fault} />
        {spent ? <AutoDegrade key={fault} fault={fault} /> : null}
        {canRestart && !spent ? (
          <div className={styles.actions}>
            <Button tone="primary" onClick={onStart}>
              {RETRY_ACTION_LABEL}
            </Button>
          </div>
        ) : null}
        <TechnicalReason>
          {rest === "" ? null : <p>{rest}</p>}
          {copy.lead === undefined || faultDetail === null ? null : (
            <p>{asSentence(faultDetail.message)}</p>
          )}
          <p>
            Reported as <code>{fault}</code>
            {faultDetail === null ? "." : ", with "}
            {faultDetail === null ? null : <code>{faultDetail.code}</code>}
            {faultDetail === null || spent ? null : `: ${faultDetail.message}`}
          </p>
        </TechnicalReason>
      </NoticeCard>
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
    <section className={styles.notice} aria-labelledby={titleId}>
      <NoticeCard glyph="meter" tone="tinted" title={PAUSED_TITLE} titleId={titleId}>
        <p className={styles.cause}>{PAUSED_BODY}</p>
        <div className={styles.actions}>
          <ActionLink href={REPLAY_ENTRY_HREF} tone="primary">
            Watch the replay
          </ActionLink>
        </div>
        <TechnicalReason>
          <p>
            Read before any call from the budget route, reported as <code>{detail.code}</code>:{" "}
            {detail.message}
          </p>
        </TechnicalReason>
      </NoticeCard>
    </section>
  )
}
