import { readFileSync } from "node:fs"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  DENSE_FROM_COLUMNS,
  Table,
  type TableColumn,
  tableDensity,
} from "@/shared/ui/data-display/table"

const SHEET = readFileSync("src/shared/ui/data-display/table/styles.module.css", "utf8")

const COLUMNS: readonly TableColumn[] = [
  { key: "code", title: "Code", rowHeader: true },
  { key: "meaning", title: "Meaning" },
  { key: "count", title: "Count", kind: "number" },
]

function renderTable() {
  return render(
    <Table
      label="Close codes"
      caption="Every session with a recorded close."
      columns={COLUMNS}
      rows={[
        { key: "1000", cells: { code: "1000", meaning: "Closed cleanly", count: 401 } },
        {
          key: "3009",
          cells: { code: "3009", meaning: "Limit", count: "not seen" },
          tone: "muted",
        },
      ]}
    />,
  )
}

describe("Table", () => {
  it("names itself, keeps its caption and marks the first column as the row header", () => {
    renderTable()
    const region = screen.getByRole("region", { name: "Close codes" })
    const table = within(region).getByRole("table")
    expect(within(table).getByText("Every session with a recorded close.")).toBeDefined()
    expect(
      within(table)
        .getAllByRole("rowheader")
        .map((cell) => cell.textContent),
    ).toEqual(["1000", "3009"])
    expect(within(table).getAllByRole("columnheader")).toHaveLength(COLUMNS.length)
  })

  it("addresses every cell by row and column, and labels it for the stacked layout", () => {
    const { container } = renderTable()
    const cell = container.querySelector('tr[data-row="1000"] td[data-column="count"]')
    expect(cell?.textContent).toBe("401")
    expect(cell?.getAttribute("data-label")).toBe("Count")
    expect(container.querySelector('tr[data-row="3009"]')?.getAttribute("data-tone")).toBe(
      "muted",
    )
  })

  it("stacks dense tables earlier, by one rule counted from the columns", () => {
    expect(tableDensity(COLUMNS)).toBe("regular")
    const dense = Array.from({ length: DENSE_FROM_COLUMNS }, (_, index) => ({
      key: `c${index}`,
      title: `Column ${index}`,
    }))
    expect(tableDensity(dense)).toBe("dense")
    expect(SHEET).toMatch(/@container table \(width < 40rem\)/)
    expect(SHEET).toMatch(
      /@container table \(width < 72rem\)[\s\S]*\[data-density="dense"\] \.head/,
    )
  })

  it("keeps a sticky header in the full layout and never scrolls sideways", () => {
    expect(SHEET).toMatch(/\.head th \{[^}]*position: sticky;/)
    expect(SHEET).not.toMatch(/overflow-x:\s*(auto|scroll)/)
  })
})
