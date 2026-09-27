"use client"

import { useId, useMemo, useState } from "react"
import type { GateDecision } from "@/domain"
import { FIELD_LABEL } from "@/features/intake/field-language"
import { Table, type TableColumn } from "@/shared/ui/data-display/table"
import { type Status, StatusChip } from "@/shared/ui/primitives/status-chip"
import { EmptyState } from "@/shared/ui/states/empty-state"
import { Heading } from "@/shared/ui/typography/heading"
import { REFUSAL_COPY, type RefusalCopy } from "../refusal-language"
import { OTHER_REFUSAL_REASONS, type RefusalReason, THE_THREE_REASONS } from "../refusal-tally"
import { rejectedRows, rowsForReason } from "../rejected-rows"
import styles from "./styles.module.css"

export type RejectedTableProps = {
  readonly decisionHistory: readonly GateDecision[]
}

const ALL_REASONS: readonly RefusalReason[] = [...THE_THREE_REASONS, ...OTHER_REFUSAL_REASONS]

const REASON_STATUS: Readonly<Record<RefusalCopy["tone"], Status>> = Object.freeze({
  asking: "asking",
  lasa: "pair",
})

const COLUMNS: readonly TableColumn[] = [
  { key: "field", title: "Field", rowHeader: true, size: "fit" },
  { key: "reason", title: "Reason", size: "fit" },
  { key: "said", title: "What the agent said" },
]

export function RejectedTable({ decisionHistory }: RejectedTableProps) {
  const [filter, setFilter] = useState<RefusalReason | null>(null)
  const rows = useMemo(() => rejectedRows(decisionHistory), [decisionHistory])
  const filtered = useMemo(() => rowsForReason(rows, filter), [rows, filter])
  const titleId = useId()

  if (rows.length === 0) {
    return (
      <EmptyState
        glyph="—"
        title="Nothing has been rejected yet"
        body="Every value the gate refused, across the whole session, appears here once the gate has decided something."
      />
    )
  }

  return (
    <section className={styles.rejected} aria-labelledby={titleId}>
      <header className={styles.head}>
        <Heading level={2} rank="block" id={titleId}>
          Rejected values
        </Heading>
        <p className={styles.note}>{`${filtered.length} of ${rows.length} shown`}</p>
      </header>
      <output className="visually-hidden" aria-live="polite">
        {`${filtered.length} of ${rows.length} rejected value${rows.length === 1 ? "" : "s"} shown`}
      </output>
      <fieldset className={styles.filters}>
        <legend className="visually-hidden">Filter rejected values by reason</legend>
        <button
          type="button"
          className={[styles.filter, filter === null ? styles.active : ""].join(" ")}
          onClick={() => setFilter(null)}
          aria-pressed={filter === null}
        >
          All reasons
        </button>
        {ALL_REASONS.map((reason) => (
          <button
            key={reason}
            type="button"
            className={[styles.filter, filter === reason ? styles.active : ""].join(" ")}
            onClick={() => setFilter(reason)}
            aria-pressed={filter === reason}
          >
            {REFUSAL_COPY[reason].label}
          </button>
        ))}
      </fieldset>

      {filtered.length === 0 ? (
        <EmptyState
          glyph="—"
          title="No rejected value matches this filter"
          body="The gate has not refused anything for this reason in this session. Absence is shown as absence, not as a zero row."
        />
      ) : (
        <Table
          label="Rejected values"
          columns={COLUMNS}
          rows={filtered.map((row, index) => ({
            key: `${row.candidateId}-${row.reasonCode}-${index}`,
            cells: {
              field: FIELD_LABEL[row.field],
              reason:
                row.reason === null ? (
                  <StatusChip status="tag">{row.reasonCode}</StatusChip>
                ) : (
                  <StatusChip status={REASON_STATUS[REFUSAL_COPY[row.reason].tone]} code>
                    {row.reasonCode}
                  </StatusChip>
                ),
              said: row.agentUtterance,
            },
          }))}
        />
      )}
    </section>
  )
}
