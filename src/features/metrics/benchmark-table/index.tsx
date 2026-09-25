import { AbsentValue } from "../absent-value"
import { type BenchmarkEntry, INPUT_LABEL } from "../benchmark-row"
import styles from "./styles.module.css"

export type BenchmarkTableProps = {
  readonly entries: readonly BenchmarkEntry[]
  readonly label?: string
}

function valueClass(entry: BenchmarkEntry): string {
  if (entry.row.value !== null && entry.tone === "alert") {
    return `${styles.value} ${styles.alert}`
  }
  return styles.value ?? ""
}

export function BenchmarkTable({ entries, label = "Benchmark figures" }: BenchmarkTableProps) {
  return (
    <section
      className={styles.wrap}
      aria-label={`${label}, scrollable sideways`}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a table that scrolls sideways must be reachable by keyboard, which axe checks as scrollable-region-focusable
      tabIndex={0}
    >
      <table className={styles.table}>
        <caption>
          One row per figure. The input column says what went in: a live socket, synthesised
          speech (TTS) sent through the live recognizer, text with assigned values, or a
          synthesised fixture. A dash means not measured, never zero.
        </caption>
        <thead>
          <tr>
            <th scope="col">Figure</th>
            <th scope="col">Value</th>
            <th scope="col">Input</th>
            <th scope="col">Command</th>
            <th scope="col">n</th>
            <th scope="col">Measured</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} data-row={entry.id}>
              <th scope="row" className={styles.figure}>
                <span className={styles.name}>{entry.row.figure}</span>
                <span className={styles.meaning}>{entry.meaning}</span>
              </th>
              <td className={valueClass(entry)} data-column="value">
                {entry.row.value === null ? <AbsentValue /> : entry.row.value}
              </td>
              <td className={styles.input} data-column="input">
                {INPUT_LABEL[entry.row.input]}
              </td>
              <td data-column="command">
                <code className={styles.command}>{entry.row.command}</code>
              </td>
              <td className={styles.number} data-column="n">
                {entry.row.n === null ? <AbsentValue /> : entry.row.n}
                <span className={styles.set}>{entry.setDescription}</span>
              </td>
              <td className={styles.number} data-column="measured">
                {entry.row.measuredOn === null ? (
                  <AbsentValue />
                ) : (
                  <time dateTime={entry.row.measuredOn}>{entry.row.measuredOn}</time>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
