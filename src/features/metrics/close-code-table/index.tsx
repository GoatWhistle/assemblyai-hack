import { Method } from "@/shared/ui/data-display/method"
import { Table, type TableColumn, type TableRow } from "@/shared/ui/data-display/table"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import {
  CLOSE_CODE_REPORT_COMMAND,
  type CloseCodeScope,
  type UnobservedCode,
} from "../close-code-tally"
import type { CloseCodeTally } from "../metric-definitions"
import styles from "./styles.module.css"

export const NOT_SEEN = "not seen"

export const UNOBSERVED_LABEL = "Close codes never observed"

export type CloseCodeTableProps = {
  readonly rows: readonly CloseCodeTally[]
  readonly unobserved: readonly UnobservedCode[]
  readonly scope: CloseCodeScope
  readonly alertWorthy: string
}

const DESCRIBED_COLUMNS: readonly TableColumn[] = [
  { key: "code", title: "Code", rowHeader: true, size: "fit" },
  { key: "meaning", title: "Observed meaning", stack: "bare" },
  { key: "source", title: "Source", kind: "muted" },
]

function columnsFor(scope: CloseCodeScope): readonly TableColumn[] {
  return [
    ...DESCRIBED_COLUMNS,
    {
      key: "before",
      title: `Before the ledger, ${scope.beforeLedgerRuns} runs`,
      kind: "number",
    },
    { key: "stress", title: "Stress run", kind: "number" },
    { key: "all", title: "All", kind: "number" },
  ]
}

function codeCell(code: number, alertWorthy: boolean) {
  return (
    <span className={styles.code}>
      {code}
      {alertWorthy ? <StatusChip status="alert">alert</StatusChip> : null}
    </span>
  )
}

function meaningCell(label: string, meaning: string) {
  return (
    <>
      <span className={styles.label}>{label}</span>{" "}
      <span className={styles.meaning}>{meaning}</span>
    </>
  )
}

export function CloseCodeMethods({ scope }: { readonly scope: CloseCodeScope }) {
  return (
    <ul className={styles.methods} aria-label="Where the close-code counts come from">
      <li>
        <Method
          command={scope.beforeLedgerCommand}
          n={scope.beforeLedgerSessions}
          set={`sessions of ${scope.beforeLedgerRuns} runs made before the spend ledger existed; ${scope.fromReportSessions} of them come from eval/REPORT.md's own account of two runs that left no file, which is weaker evidence`}
        />
      </li>
      <li>
        <Method
          command={scope.stressCommand}
          n={scope.stressSessions}
          set="sessions of the stress run"
        />
      </li>
      <li>
        <Method command={CLOSE_CODE_REPORT_COMMAND} set="the close codes of one run" />
      </li>
    </ul>
  )
}

export function CloseCodeTable({ rows, unobserved, scope, alertWorthy }: CloseCodeTableProps) {
  const observed: TableRow[] = rows.map((row) => ({
    key: String(row.code),
    cells: {
      code: codeCell(row.code, row.alertWorthy),
      meaning: meaningCell(row.label, row.meaning),
      source: row.source,
      before: row.beforeLedger === 0 ? NOT_SEEN : row.beforeLedger,
      stress: row.stress === 0 ? NOT_SEEN : row.stress,
      all: row.count,
    },
  }))
  const unseen: TableRow[] = unobserved.map((row) => ({
    key: String(row.code),
    cells: {
      code: codeCell(row.code, row.alertWorthy),
      meaning: meaningCell(row.label, row.meaning),
      source: row.source,
    },
  }))
  return (
    <>
      <Table
        label="Socket close codes"
        caption={`Every session with a recorded close, except the live smoke runs, which keep none per session; ${alertWorthy} are alert-worthy on the first occurrence because billing runs on socket lifetime, and a run containing any 1008 is not scored.`}
        columns={columnsFor(scope)}
        rows={observed}
      />
      {unseen.length === 0 ? null : (
        <Table
          label={UNOBSERVED_LABEL}
          caption={`Named by vendor prose or by another team and ${NOT_SEEN} in any recorded session here, so none of them carries a count.`}
          columns={DESCRIBED_COLUMNS}
          rows={unseen}
        />
      )}
    </>
  )
}
