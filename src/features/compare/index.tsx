import type { ReactNode } from "react"
import { Code } from "@/shared/ui/data-display/code"
import { Table, type TableColumn } from "@/shared/ui/data-display/table"
import { type Status, StatusChip } from "@/shared/ui/primitives/status-chip"
import { formatCertainty, GateVerdict, MOMENTS, type Moment } from "./moments"
import styles from "./styles.module.css"

export { formatCertainty, GateVerdict, MOMENTS, thresholdOnly, verdictFor } from "./moments"

export const COMPARE_TITLE =
  "Six moments, decided by the shipped gate and without its two rules"

export const COMPARE_CAPTION =
  "Each row is one synthesised candidate decided by the shipped gate as this page renders. The last column runs the same candidate through the same decision function with the pair rule and the standing read-back switched off, which leaves a confidence threshold plus the validators."

export const COLUMN = {
  said: "Said",
  heard: "Heard",
  certainty: "Recognizer certainty",
  verdict: "Gate verdict",
  withoutGate: "Threshold and validators only",
} as const

export const MOMENT_COLUMN = "Moment"

export const ALSO_ASKS = "Also asks:"

export const PAIR_OUTRANKS_NOTE = "outranked by the published pair"

export function partnersNote(partners: readonly string[]): string {
  return `on the ISMP list with ${partners.join(", ")}`
}

export const SOURCE_NOTE =
  "These candidates are synthesised from the documented message shapes, not recorded from a live call. The verdicts are not: every one of them is computed by decide() from the gate package, over the real field policy table."

export function verdictStatus(moment: Moment): Status {
  if (moment.verdict === GateVerdict.Pass) {
    return "written"
  }
  if (moment.verdict === GateVerdict.Refused) {
    return "refused"
  }
  return moment.pairOutranksCertainty ? "pair" : "asking"
}

export function WithoutGate({ moment }: { readonly moment: Moment }) {
  if (moment.withoutGateWrites) {
    return (
      <StatusChip status={moment.verdict === GateVerdict.Pass ? "written" : "alert"}>
        {moment.withoutGateText}
      </StatusChip>
    )
  }
  return (
    <span className={styles.stack}>
      <span className={styles.muted}>{ALSO_ASKS}</span>
      <Code>{moment.withoutGate.reasonCode}</Code>
    </span>
  )
}

function withNote(value: ReactNode, note: string | null): ReactNode {
  if (note === null) {
    return value
  }
  return (
    <span className={styles.stack}>
      <span>{value}</span>
      <span className={styles.note}>{note}</span>
    </span>
  )
}

export const MOMENT_COLUMNS: readonly TableColumn[] = [
  { key: "said", title: COLUMN.said },
  { key: "heard", title: COLUMN.heard },
  { key: "certainty", title: COLUMN.certainty },
  { key: "verdict", title: COLUMN.verdict },
  { key: "withoutGate", title: COLUMN.withoutGate },
]

export function momentCells(moment: Moment): Readonly<Record<string, ReactNode>> {
  return {
    said: moment.said,
    heard: withNote(
      moment.heard,
      moment.partners.length === 0 ? null : partnersNote(moment.partners),
    ),
    certainty: withNote(
      <span className={styles.certainty}>{formatCertainty(moment.certainty)}</span>,
      moment.pairOutranksCertainty ? PAIR_OUTRANKS_NOTE : null,
    ),
    verdict: (
      <span className={styles.stack}>
        <StatusChip status={verdictStatus(moment)}>{moment.verdict}</StatusChip>
        <Code>{moment.decision.reasonCode}</Code>
      </span>
    ),
    withoutGate: <WithoutGate moment={moment} />,
  }
}

export function Compare() {
  return (
    <div className={styles.moments}>
      <Table
        label={COMPARE_TITLE}
        columns={[{ key: "moment", title: MOMENT_COLUMN, rowHeader: true }, ...MOMENT_COLUMNS]}
        rows={MOMENTS.map((moment) => ({
          key: moment.id,
          cells: { moment: moment.title, ...momentCells(moment) },
        }))}
      />
    </div>
  )
}
