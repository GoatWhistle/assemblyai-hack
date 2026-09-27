import { readFileSync } from "node:fs"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Code } from "@/shared/ui/data-display/code"
import { Table } from "@/shared/ui/data-display/table"

const CODE_SHEET = readFileSync("src/shared/ui/data-display/code/styles.module.css", "utf8")
const TABLE_SHEET = readFileSync("src/shared/ui/data-display/table/styles.module.css", "utf8")

describe("Code", () => {
  it("renders machine text as code at the inline code size, never breaking a reason code", () => {
    const { container } = render(<Code>E_LASA_HIT</Code>)
    expect(container.querySelector("code")?.textContent).toBe("E_LASA_HIT")
    expect(CODE_SHEET).toMatch(/font-size: var\(--code-size\);/)
    expect(CODE_SHEET).toMatch(/\.code \{[^}]*white-space: nowrap;/)
  })

  it("lets a long digest break anywhere when asked, and only then", () => {
    const { container } = render(<Code breakable>{"a".repeat(64)}</Code>)
    const classes = container.querySelector("code")?.className ?? ""
    expect(classes.split(" ")).toHaveLength(2)
    expect(CODE_SHEET).toMatch(/\.breakable \{[^}]*overflow-wrap: anywhere;/)
  })
})

describe("Table rows as anchors and command columns", () => {
  it("puts a row id on the row, so a link can land on one row", () => {
    const { container } = render(
      <Table
        label="Terms"
        columns={[
          { key: "term", title: "Term", rowHeader: true },
          { key: "run", title: "Command", kind: "command" },
        ]}
        rows={[{ key: "lasa", id: "term-lasa", cells: { term: "LASA", run: "make eval" } }]}
      />,
    )
    const row = container.querySelector("#term-lasa")
    expect(row?.tagName).toBe("TR")
    expect(row?.getAttribute("data-row")).toBe("lasa")
    expect(row?.querySelector('td[data-column="run"]')?.className).not.toBe("")
  })

  it("keeps a command or a fitted cell on one line in the full layout and lets it wrap once stacked", () => {
    expect(TABLE_SHEET).toMatch(
      /\.table :is\(\.number, \.figure, \.command, \.fit\) \{\s*white-space: var\(--stack-wrap, nowrap\);/,
    )
    expect(TABLE_SHEET).toMatch(/\.table \.fit \{\s*width: var\(--stack-width, 1%\);/)
    for (const width of ["40rem", "72rem"]) {
      const block = TABLE_SHEET.split(`@container table (width < ${width})`)[1] ?? ""
      expect(block, width).toMatch(/--stack-wrap: normal;/)
      expect(block, width).toMatch(/--stack-width: auto;/)
    }
    expect(TABLE_SHEET, "anywhere would let a fitted column collapse to one letter").toMatch(
      /\.value \{[^}]*overflow-wrap: break-word;/,
    )
    expect(TABLE_SHEET).toMatch(/tr\[id\] \{\s*scroll-margin-top/)
  })

  it("switches both stacked layouts with one identical set of switches, so they cannot drift", () => {
    const [, afterRegular = ""] = TABLE_SHEET.split("@container table (width < 40rem)")
    const [regular = "", dense = ""] = afterRegular.split("@container table (width < 72rem)")
    const switches = (block: string) =>
      [...block.matchAll(/(--stack-[a-z-]+): ([^;]+);/g)].map((m) => `${m[1]}: ${m[2]}`)
    expect(switches(regular)).toContain("--stack-grid: grid")
    expect(switches(regular)).toContain("--stack-label: block")
    expect(switches(dense)).toEqual(switches(regular))
  })

  it("lets a prose column take the whole stacked row, with its label above or with none", () => {
    const { container } = render(
      <Table
        label="Terms"
        columns={[
          { key: "term", title: "Term", rowHeader: true },
          { key: "watch", title: "What to watch", stack: "line" },
          { key: "meaning", title: "Meaning", stack: "bare" },
          { key: "input", title: "Input" },
        ]}
        rows={[{ key: "lasa", cells: { term: "LASA", watch: "a", meaning: "b", input: "c" } }]}
      />,
    )
    const cell = (key: string) => container.querySelector(`td[data-column="${key}"]`)
    expect(cell("meaning")?.getAttribute("data-label")).toBe("Meaning")
    expect(cell("watch")?.className).not.toBe(cell("input")?.className)
    expect(cell("meaning")?.className).not.toBe(cell("watch")?.className)
    expect(TABLE_SHEET, "a stacked row is a two-column grid of label and value").toMatch(
      /\.table tbody tr \{[^}]*display: var\(--stack-grid, table-row\);[^}]*grid-template-columns: fit-content\(32%\) minmax\(0, 1fr\);/,
    )
    expect(TABLE_SHEET, "every field shares the row's label column").toMatch(
      /\.table tbody td \{[^}]*grid-template-columns: subgrid;/,
    )
    expect(TABLE_SHEET).toMatch(
      /tbody :is\(\.line, \.bare, \.figure\) \{\s*grid-template-columns: minmax\(0, 1fr\);/,
    )
    expect(TABLE_SHEET).toMatch(/:is\(\.bare, \.figure\)::before \{\s*content: none;/)
    expect(TABLE_SHEET, "a label exists only once stacked").toMatch(
      /td::before \{[^}]*content: attr\(data-label\);[^}]*display: var\(--stack-label, none\);/,
    )
    expect(TABLE_SHEET, "a code column's label reads as a label, not as code").toMatch(
      /td::before \{[^}]*font-family: var\(--font-ui\);/,
    )
  })
})
