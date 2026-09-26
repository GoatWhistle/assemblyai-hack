import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type PanelColumnKind = "code" | "text" | "muted" | "count"

export type PanelColumn = {
  readonly key: string
  readonly title: string
  readonly kind: PanelColumnKind
}

export type PanelRow = {
  readonly key: string
  readonly cells: Readonly<Record<string, ReactNode>>
}

export type PanelTableProps = {
  readonly label: string
  readonly caption: ReactNode
  readonly columns: readonly PanelColumn[]
  readonly rows: readonly PanelRow[]
}

const KIND_CLASS: Readonly<Record<PanelColumnKind, string | undefined>> = {
  code: styles.code,
  text: undefined,
  muted: styles.muted,
  count: styles.count,
}

export function PanelTable({ label, caption, columns, rows }: PanelTableProps) {
  return (
    <section className={styles.wrap} aria-label={label}>
      <table className={styles.table}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.kind === "count" ? styles.count : undefined}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={KIND_CLASS[column.kind]}
                  data-label={column.kind === "count" ? column.title : undefined}
                >
                  {row.cells[column.key] ?? null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
