import { Command } from "@/shared/ui/data-display/command"
import { AbsentValue } from "../absent-value"
import { type BenchmarkEntry, INPUT_LABEL } from "../benchmark-row"
import styles from "./styles.module.css"

export const BENCHMARK_CAPTION =
  "One row per figure. The input column says what went in: a live socket, synthesised speech (TTS) sent through the live recognizer, text with assigned values, or a synthesised fixture. A dash means not measured, never zero."

export type BenchmarkTableProps = {
  readonly entries: readonly BenchmarkEntry[]
  readonly label?: string
  readonly caption?: string
  readonly compact?: boolean
}

function sentenceCase(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

function valueClass(entry: BenchmarkEntry): string {
  if (entry.row.value !== null && entry.tone === "alert") {
    return `${styles.value} ${styles.alert}`
  }
  return styles.value ?? ""
}

export function BenchmarkTable({
  entries,
  label = "Benchmark figures",
  caption = BENCHMARK_CAPTION,
  compact = false,
}: BenchmarkTableProps) {
  return (
    <section className={styles.wrap} aria-label={label}>
      <table className={styles.table}>
        <caption>{caption}</caption>
        <thead className={styles.columns}>
          <tr>
            <th scope="col" className={styles.headFigure}>
              Figure
            </th>
            <th scope="col" className={styles.headValue}>
              Value
            </th>
            <th scope="col">Input</th>
            <th scope="col" className={styles.headCommand}>
              Command
            </th>
            <th scope="col" className={styles.headSet}>
              n
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} data-row={entry.id}>
              <th scope="row" className={styles.figure}>
                <span className={styles.name}>{sentenceCase(entry.row.figure)}</span>
                {compact || entry.meaning === "" ? null : (
                  <span className={styles.meaning}>{entry.meaning}</span>
                )}
              </th>
              <td className={valueClass(entry)} data-column="value">
                {entry.row.value === null ? <AbsentValue /> : entry.row.value}
              </td>
              <td className={styles.input} data-column="input">
                {INPUT_LABEL[entry.row.input]}
              </td>
              <td className={styles.commandCell} data-column="command">
                <Command value={entry.row.command} />
              </td>
              <td
                className={`${styles.number} ${styles.n}`}
                data-column="n"
                data-absent={entry.row.n === null ? "" : undefined}
              >
                {entry.row.n === null ? <AbsentValue /> : entry.row.n}
                {compact || entry.setDescription === "" ? null : (
                  <span className={styles.set}>{entry.setDescription}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
