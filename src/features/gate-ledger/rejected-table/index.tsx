"use client"

import { useMemo, useState } from "react"
import type { GateDecision } from "@/domain"
import { FIELD_LABEL } from "@/features/intake/field-language"
import { Chip, type ChipTone } from "@/shared/ui/primitives/chip"
import { Panel } from "@/shared/ui/primitives/panel"
import { EmptyState } from "@/shared/ui/states/empty-state"
import { REFUSAL_COPY, type RefusalCopy } from "../refusal-language"
import { OTHER_REFUSAL_REASONS, type RefusalReason, THE_THREE_REASONS } from "../refusal-tally"
import { rejectedRows, rowsForReason } from "../rejected-rows"
import styles from "./styles.module.css"

export type RejectedTableProps = {
  readonly decisionHistory: readonly GateDecision[]
}

const ALL_REASONS: readonly RefusalReason[] = [...THE_THREE_REASONS, ...OTHER_REFUSAL_REASONS]

const CHIP_TONE: Readonly<Record<RefusalCopy["tone"], ChipTone>> = Object.freeze({
  asking: "asking",
  lasa: "lasa",
})

export function RejectedTable({ decisionHistory }: RejectedTableProps) {
  const [filter, setFilter] = useState<RefusalReason | null>(null)
  const rows = useMemo(() => rejectedRows(decisionHistory), [decisionHistory])
  const filtered = useMemo(() => rowsForReason(rows, filter), [rows, filter])

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
    <Panel
      title="Rejected values"
      note={`${filtered.length} of ${rows.length} shown`}
      padding="tight"
    >
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
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Reason</th>
              <th scope="col">What the agent said</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={`${row.candidateId}-${row.reasonCode}-${index}`}>
                <td>{FIELD_LABEL[row.field]}</td>
                <td>
                  {row.reason === null ? (
                    <Chip tone="plain">{row.reasonCode}</Chip>
                  ) : (
                    <Chip tone={CHIP_TONE[REFUSAL_COPY[row.reason].tone]} monospace>
                      {row.reasonCode}
                    </Chip>
                  )}
                </td>
                <td className={styles.utterance}>{row.agentUtterance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}
