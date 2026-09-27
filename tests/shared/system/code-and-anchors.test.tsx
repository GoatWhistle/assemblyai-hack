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
      /\.table :is\(\.number, \.figure, \.command, \.fit\) \{\s*white-space: nowrap;/,
    )
    for (const width of ["40rem", "60rem"]) {
      const block = TABLE_SHEET.split(`@container table (width < ${width})`)[1] ?? ""
      expect(block, width).toMatch(
        /tbody :is\(\.fit, \.fill, \.command\) \{\s*width: auto;\s*white-space: normal;/,
      )
    }
    expect(TABLE_SHEET, "anywhere would let a fitted column collapse to one letter").toMatch(
      /\.value \{[^}]*overflow-wrap: break-word;/,
    )
    expect(TABLE_SHEET).toMatch(/tr\[id\] \{\s*scroll-margin-top/)
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
    for (const width of ["40rem", "60rem"]) {
      const block = TABLE_SHEET.split(`@container table (width < ${width})`)[1] ?? ""
      expect(block, width).toMatch(/:is\(th, \.line, \.bare\) \{[^}]*flex: 1 1 100%;/)
      expect(block, width).toMatch(/\.bare::before \{\s*content: none;/)
      expect(block, `${width}: a code column's label reads as a label, not as code`).toMatch(
        /td::before \{[^}]*font-family: var\(--font-ui\);/,
      )
    }
  })
})
