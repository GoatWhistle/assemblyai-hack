import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type TableColumnKind = "text" | "number" | "figure" | "code" | "muted"

export type TableColumnSize = "auto" | "fit" | "fill"

export type TableColumn = {
  readonly key: string
  readonly title: string
  readonly kind?: TableColumnKind
  readonly size?: TableColumnSize
  readonly rowHeader?: boolean
}

export type TableRowTone = "normal" | "muted" | "emphasis" | "alert"

export type TableRow = {
  readonly key: string
  readonly cells: Readonly<Record<string, ReactNode>>
  readonly tone?: TableRowTone
}

export type TableProps = {
  readonly label: string
  readonly caption?: ReactNode
  readonly columns: readonly TableColumn[]
  readonly rows: readonly TableRow[]
}

export const DENSE_FROM_COLUMNS = 5

const KIND_CLASS: Readonly<Record<TableColumnKind, string | undefined>> = {
  text: undefined,
  number: styles.number,
  figure: styles.figure,
  code: styles.code,
  muted: styles.muted,
}

const SIZE_CLASS: Readonly<Record<TableColumnSize, string | undefined>> = {
  auto: undefined,
  fit: styles.fit,
  fill: styles.fill,
}

const TONE_CLASS: Readonly<Record<TableRowTone, string | undefined>> = {
  normal: undefined,
  muted: styles.mutedRow,
  emphasis: styles.emphasisRow,
  alert: styles.alertRow,
}

function join(...parts: readonly (string | undefined | false)[]): string | undefined {
  const value = parts.filter((part) => typeof part === "string" && part !== "").join(" ")
  return value === "" ? undefined : value
}

export function tableDensity(columns: readonly TableColumn[]): "regular" | "dense" {
  return columns.length >= DENSE_FROM_COLUMNS ? "dense" : "regular"
}

function Cell({
  column,
  children,
}: {
  readonly column: TableColumn
  readonly children: ReactNode
}) {
  const kind = column.kind ?? "text"
  const className = join(
    KIND_CLASS[kind],
    SIZE_CLASS[column.size ?? "auto"],
    column.rowHeader === true && styles.rowHeader,
  )
  if (column.rowHeader === true) {
    return (
      <th scope="row" className={className} data-column={column.key}>
        {children}
      </th>
    )
  }
  return (
    <td className={className} data-column={column.key} data-label={column.title}>
      <span className={styles.value}>{children}</span>
    </td>
  )
}

export function Table({ label, caption, columns, rows }: TableProps) {
  return (
    <section className={styles.frame} aria-label={label} data-density={tableDensity(columns)}>
      <table className={styles.table}>
        {caption === undefined ? null : <caption className={styles.caption}>{caption}</caption>}
        <thead className={styles.head}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={join(
                  KIND_CLASS[column.kind ?? "text"],
                  SIZE_CLASS[column.size ?? "auto"],
                )}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              data-row={row.key}
              data-tone={row.tone ?? "normal"}
              className={TONE_CLASS[row.tone ?? "normal"]}
            >
              {columns.map((column) => (
                <Cell key={column.key} column={column}>
                  {row.cells[column.key] ?? null}
                </Cell>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
