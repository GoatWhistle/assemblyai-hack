import { Chip } from "@/shared/ui/primitives/chip"
import type { CloseCodeTally } from "../metric-definitions"
import styles from "./styles.module.css"

export type CloseCodeTableProps = {
  readonly rows: readonly CloseCodeTally[]
  readonly setDescription: string
}

export function CloseCodeTable({ rows, setDescription }: CloseCodeTableProps) {
  return (
    <section
      className={styles.wrap}
      aria-label="Socket close codes, scrollable sideways"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a table that scrolls sideways must be reachable by keyboard, which axe checks as scrollable-region-focusable
      tabIndex={0}
    >
      <table className={styles.table}>
        <caption>
          Counted from {setDescription}. 1008, 3008 and 3009 are alert-worthy on the first
          occurrence, because billing runs on socket lifetime rather than audio volume. A run
          containing any 1008 is a rate-limit artefact and is not scored.
        </caption>
        <thead>
          <tr>
            <th scope="col">Code</th>
            <th scope="col">Meaning</th>
            <th scope="col">Seen</th>
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
              <td className={styles.count}>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
