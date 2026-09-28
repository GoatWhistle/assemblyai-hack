import { Command } from "@/shared/ui/data-display/command"
import { Table, type TableColumn, type TableRow } from "@/shared/ui/data-display/table"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import { AbsentValue } from "../absent-value"
import { type BenchmarkEntry, INPUT_LABEL, NOT_MEASURED_LABEL } from "../benchmark-row"
import { NO_COMMAND } from "../metric-definitions"
import styles from "./styles.module.css"

export const BENCHMARK_CAPTION =
  "One row per figure. The input column says what went in: a live socket, synthesised speech (TTS) sent through the live recognizer, text with assigned values, or a synthesised fixture. A dash means not measured, never zero."

export type BenchmarkTableProps = {
  readonly entries: readonly BenchmarkEntry[]
  readonly label?: string
  readonly caption?: string
  readonly compact?: boolean
}

const NOT_A_COMMAND: ReadonlySet<string> = new Set([NO_COMMAND, NOT_MEASURED_LABEL])

function columnsFor(entries: readonly BenchmarkEntry[]): readonly TableColumn[] {
  const allAbsent = entries.every((entry) => entry.row.value === null)
  return [
    { key: "figure", title: "Figure", rowHeader: true, size: "fill" },
    { key: "value", title: "Value", kind: allAbsent ? "number" : "figure" },
    { key: "input", title: "Input", kind: "muted", size: "fit" },
    { key: "command", title: "Command", kind: "command" },
    { key: "n", title: "n", kind: "number", stack: "wide" },
  ]
}

function sentenceCase(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

function sentencesOf(text: string): readonly string[] {
  return text.split(/(?<=\.)\s+/).filter((sentence) => sentence !== "")
}

export function unrepeatedMeaning(
  entry: BenchmarkEntry,
  previous: BenchmarkEntry | undefined,
): string {
  if (previous === undefined) {
    return entry.meaning
  }
  const said = new Set(sentencesOf(previous.meaning))
  return sentencesOf(entry.meaning)
    .filter((sentence) => !said.has(sentence))
    .join(" ")
}

const INTERVAL = /^(.*?)\s+(\[[^\]]+\])$/

function Reading({ value }: { readonly value: string | number }) {
  const parts = INTERVAL.exec(String(value))
  if (parts === null) {
    return <>{value}</>
  }
  return (
    <>
      {parts[1]} <span className={styles.interval}>{parts[2]}</span>
    </>
  )
}

function rowFor(entry: BenchmarkEntry, meaning: string, compact: boolean): TableRow {
  return {
    key: entry.id,
    tone: entry.row.value !== null && entry.tone === "alert" ? "alert" : "normal",
    cells: {
      figure: (
        <>
          <span className={styles.name}>{sentenceCase(entry.row.figure)}</span>
          {compact || meaning === "" ? null : <span className={styles.meaning}>{meaning}</span>}
        </>
      ),
      value: entry.row.value === null ? <AbsentValue /> : <Reading value={entry.row.value} />,
      input: <StatusChip status="tag">{INPUT_LABEL[entry.row.input]}</StatusChip>,
      command: NOT_A_COMMAND.has(entry.row.command) ? (
        <span className={styles.noCommand}>{entry.row.command}</span>
      ) : (
        <Command value={entry.row.command} />
      ),
      n: (
        <>
          {entry.row.n === null ? <AbsentValue /> : entry.row.n}
          {compact || entry.setDescription === "" ? null : (
            <span className={styles.set}>{entry.setDescription}</span>
          )}
        </>
      ),
    },
  }
}

export function BenchmarkTable({
  entries,
  label = "Benchmark figures",
  caption = BENCHMARK_CAPTION,
  compact = false,
}: BenchmarkTableProps) {
  return (
    <Table
      label={label}
      caption={caption}
      columns={columnsFor(entries)}
      rows={entries.map((entry, index) =>
        rowFor(entry, unrepeatedMeaning(entry, entries[index - 1]), compact),
      )}
    />
  )
}
