import { Chip } from "@/shared/ui/primitives/chip"
import { CLOSE_CODE_REPORT_COMMAND } from "../close-code-tally"
import type { CloseCodeTally } from "../metric-definitions"
import styles from "./styles.module.css"

export type CloseCodeTableProps = {
  readonly rows: readonly CloseCodeTally[]
  readonly setDescription: string
  readonly alertWorthy: string
}

export function CloseCodeTable({ rows, setDescription, alertWorthy }: CloseCodeTableProps) {
  return (
    <section className={styles.wrap} aria-label="Socket close codes">
      <table className={styles.table}>
        <caption>
          Counted from {setDescription};{" "}
          <code className={styles.command}>{CLOSE_CODE_REPORT_COMMAND}</code> prints the close
          codes of one run. {alertWorthy} are alert-worthy on the first occurrence, because
          billing runs on socket lifetime rather than audio volume. A run containing any 1008 is
          a rate-limit artefact and is not scored.
        </caption>
        <thead>
          <tr>
            <th scope="col">Code</th>
            <th scope="col">Observed meaning</th>
            <th scope="col">Source</th>
            <th scope="col" className={styles.count}>
              Seen
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code}>
              <td className={styles.code}>
                {row.code}
                {row.alertWorthy ? (
                  <>
                    {" "}
                    <Chip tone="escalated">alert</Chip>
                  </>
                ) : null}
              </td>
              <td>
                <span className={styles.label}>{row.label}</span>
                <span className={styles.meaning}> {row.meaning}</span>
              </td>
              <td className={styles.source}>{row.source}</td>
              <td className={styles.count}>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
