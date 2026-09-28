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

  it("caps a cell's text at the reading measure, so a wide docs column never runs a line past it", () => {
    expect(SHEET).toMatch(
      /\.value \{[^}]*display: block;[^}]*max-width: var\(--measure-reading\);/,
    )
  })

  it("lays a dense row out as fields side by side between 40 and 72rem, and keeps the other layouts", () => {
    const [, mid = ""] = SHEET.split("@container table (40rem <= width < 72rem)")
    expect(mid).toMatch(
      /:where\(\[data-density="dense"\]\) \.table tbody tr \{[^}]*grid-template-columns: repeat\(auto-fill, minmax\(11rem, 1fr\)\);/,
    )
    expect(mid, "an ordinary field puts its label above its value in its own track").toMatch(
      /td:where\(:not\(\.line, \.bare, \.figure\)\) \{[^}]*grid-column: auto;[^}]*grid-template-columns: minmax\(0, 1fr\);[^}]*row-gap: var\(--space-1\);/,
    )
    expect(mid).toMatch(/td\.wide \{\s*grid-column: span 2;/)
    expect(mid, "a command keeps a whole line rather than breaking inside a word").toMatch(
      /td\.command \{\s*grid-column: 1 \/ -1;/,
    )
    expect(
      mid,
      "no layout switch moves, so under 40rem and the full table are untouched",
    ).not.toMatch(/--stack-/)
    expect(SHEET).toMatch(/\.table tbody th,\s*\.table tbody td \{\s*grid-column: 1 \/ -1;/)
  })

  it("offers a wide stacked field as a column option", () => {
    const { container } = render(
      <Table
        label="Figures"
        columns={[
          { key: "figure", title: "Figure", rowHeader: true },
          { key: "n", title: "n", kind: "number", stack: "wide" },
          { key: "input", title: "Input" },
        ]}
        rows={[{ key: "a", cells: { figure: "A", n: "40", input: "TTS" } }]}
      />,
    )
    const n = container.querySelector('td[data-column="n"]')
    const input = container.querySelector('td[data-column="input"]')
    expect(n?.className.split(" ").length).toBeGreaterThan(
      input?.className.split(" ").length ?? 0,
    )
  })
})
