import type { FieldName, OrderWitness } from "@/domain"
import { ConfirmationReceipt } from "@/features/confirmation/confirmation-receipt"
import { FIELD_LABEL } from "@/features/intake/field-language"
import { WitnessBadge } from "@/features/receipt/witness-badge"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { Chip } from "@/shared/ui/primitives/chip"
import type { LiveOrderSnapshot } from "../live-snapshot"
import type { OrderGroups, SummaryRow } from "../order-groups"
import styles from "./styles.module.css"

export const AWAITING_VERIFICATION = "Awaiting pharmacist verification"

export type OrderPanelProps = {
  readonly groups: OrderGroups
  readonly snapshot: LiveOrderSnapshot | null
  readonly sessionId?: string | null
  readonly witness?: OrderWitness | null
}

function Rows({
  rows,
  empty,
  witness = null,
}: {
  readonly rows: readonly SummaryRow[]
  readonly empty: string
  readonly witness?: OrderWitness | null
}) {
  if (rows.length === 0) {
    return <p className={styles.empty}>{empty}</p>
  }
  return (
    <ul className={styles.rows}>
      {rows.map((row) => (
        <li key={row.field} className={styles.row}>
          <span className={styles.field}>{FIELD_LABEL[row.field]}</span>
          <span className={styles.value}>{row.value ?? "not heard yet"}</span>
          {row.reasonCode === null ? null : (
            <code className={styles.code}>{row.reasonCode}</code>
          )}
          <WitnessBadge witness={witness} field={row.field} />
          {row.evidence === null ? null : (
            <div className={styles.evidence}>
              <ConfirmationReceipt evidence={row.evidence} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function clockOf(atMs: number): string {
  return `${new Date(atMs).toISOString().slice(11, 19)} UTC`
}

function fieldList(fields: readonly FieldName[]): string {
  return fields.map((field) => FIELD_LABEL[field]).join(", ")
}

function CommitState({ groups, snapshot }: OrderPanelProps) {
  if (groups.committed && snapshot !== null) {
    return (
      <output className={[styles.commit, styles.committed].join(" ")}>
        <span className={styles.commitWord}>Committed</span>
        <span>
          Reference <strong className={styles.reference}>{snapshot.referenceNumber}</strong>
        </span>
        <Chip tone="pending">{AWAITING_VERIFICATION}</Chip>
      </output>
    )
  }
  if (groups.commitBlocked) {
    return (
      <output className={[styles.commit, styles.blocked].join(" ")}>
        <span className={styles.commitWord}>Commit blocked</span>
        <span>
          {groups.missingCritical.length} critical field
          {groups.missingCritical.length === 1 ? " is" : "s are"} unresolved:{" "}
          {fieldList(groups.missingCritical)}
        </span>
      </output>
    )
  }
  if (snapshot === null) {
    return (
      <output className={styles.commit}>
        The server has not reported the order's commit state yet, so nothing here claims it.
      </output>
    )
  }
  return (
    <output className={styles.commit}>
      <span className={styles.commitWord}>Ready to commit</span>
      <span>Every critical field is proved; the agent commits after its final read-back.</span>
    </output>
  )
}

export function OrderPanel({
  groups,
  snapshot,
  sessionId = null,
  witness = null,
}: OrderPanelProps) {
  const refusals = snapshot?.commitRefusals ?? []
  return (
    <section className={styles.panel} aria-label="Order summary">
      <h2 className={styles.title}>The order, as the pharmacist receives it</h2>
      <CommitState groups={groups} snapshot={snapshot} />
      {groups.committed && sessionId !== null ? (
        <ActionLink href={`/order/${encodeURIComponent(sessionId)}`}>
          Open the receipt, rechecked in your browser
        </ActionLink>
      ) : null}
      {refusals.length === 0 ? null : (
        <ul className={styles.refusals}>
          {refusals.map((refusal) => (
            <li key={`${refusal.atMs}-${refusal.reasonCode}`}>
              The hold refused commitOrder before the write at {clockOf(refusal.atMs)}:{" "}
              {fieldList(refusal.missing)} not proved. <code>{refusal.reasonCode}</code>
            </li>
          ))}
        </ul>
      )}
      {groups.stopped.length === 0 ? null : (
        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Stopped by the gate</h3>
          <Rows rows={groups.stopped} empty="" />
        </div>
      )}
      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Proved by arithmetic or the catalogue</h3>
        <Rows witness={witness} rows={groups.proved} empty="Nothing proved this way yet." />
      </div>
      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Confirmed aloud</h3>
        <Rows witness={witness} rows={groups.confirmed} empty="Nothing confirmed aloud yet." />
      </div>
      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Not resolved</h3>
        <Rows rows={groups.unresolved} empty="Nothing is left unresolved." />
      </div>
    </section>
  )
}
