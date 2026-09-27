import { Command } from "@/shared/ui/data-display/command"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import {
  CLOSE_CODE_REPORT_COMMAND,
  type CloseCodeScope,
  type UnobservedCode,
} from "../close-code-tally"
import type { CloseCodeTally } from "../metric-definitions"
import { type PanelColumn, type PanelRow, PanelTable } from "../panel-table"
import styles from "./styles.module.css"

export const NOT_SEEN = "not seen"

export type CloseCodeTableProps = {
  readonly rows: readonly CloseCodeTally[]
  readonly unobserved: readonly UnobservedCode[]
  readonly scope: CloseCodeScope
  readonly alertWorthy: string
}

function columnsFor(scope: CloseCodeScope): readonly PanelColumn[] {
  return [
    { key: "code", title: "Code", kind: "code" },
    { key: "meaning", title: "Observed meaning", kind: "text" },
    { key: "source", title: "Source", kind: "muted" },
    {
      key: "before",
      title: `Before the ledger, ${scope.beforeLedgerRuns} runs`,
      kind: "count",
    },
    { key: "stress", title: "Stress run", kind: "count" },
    { key: "all", title: "All", kind: "count" },
  ]
}

function codeCell(code: number, alertWorthy: boolean) {
  return (
    <>
      {code}
      {alertWorthy ? (
        <>
          {" "}
          <StatusChip status="alert">alert</StatusChip>
        </>
      ) : null}
    </>
  )
}

function meaningCell(label: string, meaning: string) {
  return (
    <>
      <span className={styles.label}>{label}</span>
      <span className={styles.meaning}> {meaning}</span>
    </>
  )
}

function Caption({ scope, alertWorthy }: Pick<CloseCodeTableProps, "scope" | "alertWorthy">) {
  return (
    <>
      Every session with a recorded close. {scope.beforeLedgerSessions} sessions over{" "}
      {scope.beforeLedgerRuns} runs made before the spend ledger existed,{" "}
      <Command value={scope.beforeLedgerCommand} />; {scope.fromReportSessions} of them come
      from eval/REPORT.md&rsquo;s own account of two runs that left no file, which is weaker
      evidence. {scope.stressSessions} sessions of the stress run,{" "}
      <Command value={scope.stressCommand} />. The live smoke runs keep no close code per
      session and are not counted. <Command value={CLOSE_CODE_REPORT_COMMAND} /> prints the
      close codes of one run. {alertWorthy} are alert-worthy on the first occurrence, because
      billing runs on socket lifetime rather than audio volume. A run containing any 1008 is a
      rate-limit artefact and is not scored.
    </>
  )
}

export function CloseCodeTable({ rows, unobserved, scope, alertWorthy }: CloseCodeTableProps) {
  const observed: PanelRow[] = rows.map((row) => ({
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
  const unseen: PanelRow[] = unobserved.map((row) => ({
    key: String(row.code),
    cells: {
      code: codeCell(row.code, row.alertWorthy),
      meaning: meaningCell(row.label, row.meaning),
      source: row.source,
      before: NOT_SEEN,
      stress: NOT_SEEN,
      all: NOT_SEEN,
    },
  }))
  return (
    <PanelTable
      label="Socket close codes"
      caption={<Caption scope={scope} alertWorthy={alertWorthy} />}
      columns={columnsFor(scope)}
      rows={[...observed, ...unseen]}
    />
  )
}
