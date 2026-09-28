import OperationsPage from "@app/(pages)/(docs)/metrics/operations/page"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { UNOBSERVED_LABEL } from "@/features/metrics/close-code-table"
import { closeCodeRows, unobservedCodeRows } from "@/features/metrics/close-code-tally"

function rowHeaders(region: HTMLElement): readonly string[] {
  return within(region)
    .getAllByRole("rowheader")
    .map((cell) => cell.textContent ?? "")
}

describe("a close code nobody observed carries no count", () => {
  it("counts only observed codes, and names every other code in its own table without a number", () => {
    const unobserved = unobservedCodeRows()
    expect(unobserved.length, "the vendor-prose codes must stay on the page").toBeGreaterThan(0)
    render(<OperationsPage />)
    const counted = screen.getByRole("region", { name: "Socket close codes" })
    const named = screen.getByRole("region", { name: UNOBSERVED_LABEL })
    for (const row of closeCodeRows()) {
      expect(rowHeaders(counted).some((text) => text.startsWith(String(row.code)))).toBe(true)
    }
    for (const row of unobserved) {
      expect(rowHeaders(counted).some((text) => text.startsWith(String(row.code)))).toBe(false)
      expect(
        rowHeaders(named).some((text) => text.startsWith(String(row.code))),
        `${row.code}`,
      ).toBe(true)
      expect(within(named).getAllByText(row.source).length).toBeGreaterThan(0)
    }
    for (const cell of named.querySelectorAll("td")) {
      expect(cell.getAttribute("data-column")).toMatch(/^(meaning|source)$/)
    }
  })
})
