import { existsSync } from "node:fs"
import BenchmarkPage from "@app/(pages)/(docs)/metrics/benchmark/page"
import OperationsPage from "@app/(pages)/(docs)/metrics/operations/page"
import MetricsPage from "@app/(pages)/(docs)/metrics/page"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  type BenchmarkEntry,
  benchmarkEntries,
  INPUT_LABEL,
  NOT_MEASURED_LABEL,
  RAW_RUN_AGREEMENT_TEST,
} from "@/features/metrics/benchmark-row"
import { BenchmarkTable } from "@/features/metrics/benchmark-table"
import { BUSINESS_FIGURES } from "@/features/metrics/business-figures"
import { NOT_MEASURED_YET } from "@/features/metrics/business-reading"
import { FalseAskHeadline, HEADLINE_POLICY } from "@/features/metrics/false-ask-headline"
import { falseAskTally } from "@/features/metrics/measured-figures"

const ALLOWED_INPUTS = new Set(["live socket", "TTS", "text", "fixture"])

function rowFor(id: string): HTMLElement {
  const row = document.querySelector<HTMLElement>(`tr[data-row="${id}"]`)
  if (row === null) {
    throw new Error(`no rendered row for ${id}`)
  }
  return row
}

function cell(row: HTMLElement, column: string): HTMLElement {
  const found = row.querySelector<HTMLElement>(`td[data-column="${column}"]`)
  if (found === null) {
    throw new Error(`row has no ${column} cell`)
  }
  return found
}

function isDash(element: HTMLElement): boolean {
  return element.querySelector(`[aria-label="${NOT_MEASURED_LABEL}"]`) !== null
}

const UNMEASURED: BenchmarkEntry = {
  id: "planted-absence",
  row: {
    figure: "Planted absence",
    value: null,
    input: "live socket",
    command: "make measure",
    n: null,
    measuredOn: null,
  },
  meaning: "A row with nothing behind it.",
  setDescription: "no run",
  tone: "neutral",
}

describe("every benchmark row carries its method", () => {
  it("renders each row's command and its n, or a dash where n is absent", () => {
    render(<BenchmarkPage />)
    for (const entry of benchmarkEntries()) {
      const row = rowFor(entry.id)
      expect(within(cell(row, "command")).getByText(entry.row.command)).toBeDefined()
      const n = cell(row, "n")
      if (entry.row.n === null) {
        expect(isDash(n), `${entry.id} has no n and must show a dash`).toBe(true)
      } else {
        expect(n.textContent?.startsWith(String(entry.row.n)), entry.id).toBe(true)
      }
    }
  })

  it("never publishes a value without a set size and a date", () => {
    for (const entry of benchmarkEntries()) {
      if (entry.row.value === null) {
        continue
      }
      expect(entry.row.n, `${entry.id} has a value but no n`).not.toBeNull()
      expect(entry.row.measuredOn, `${entry.id} has a value but no date`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      )
    }
  })

  it("gives every row an input from the four allowed values", () => {
    render(<BenchmarkPage />)
    const entries = benchmarkEntries()
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      const text = cell(rowFor(entry.id), "input").textContent ?? ""
      expect(ALLOWED_INPUTS.has(text), `${entry.id} renders input "${text}"`).toBe(true)
    }
    expect(new Set(Object.values(INPUT_LABEL))).toEqual(ALLOWED_INPUTS)
  })
})

describe("an unmeasured figure is a dash, never a zero", () => {
  it("renders a planted unmeasured row as a labelled dash in value and n", () => {
    render(<BenchmarkTable entries={[UNMEASURED]} />)
    const row = rowFor(UNMEASURED.id)
    for (const column of ["value", "n"]) {
      expect(isDash(cell(row, column)), column).toBe(true)
    }
    expect(cell(row, "value").textContent).not.toContain("0")
    expect(screen.getAllByLabelText(NOT_MEASURED_LABEL).length).toBeGreaterThanOrEqual(2)
  })

  it("publishes words re-said per order as a dash until a live order exists", () => {
    render(<BenchmarkPage />)
    const row = rowFor("words-resaid-per-order")
    expect(within(row).getByText("Words re-said per order")).toBeDefined()
    expect(isDash(cell(row, "value"))).toBe(true)
  })
})

describe("the false-ask headline", () => {
  it("states how often the gate asked, out of how many fields", () => {
    const tally = falseAskTally()
    expect(
      tally,
      "the recorded runs carry correct values, so the headline is measured",
    ).not.toBe(null)
    render(<MetricsPage />)
    const headline = document.querySelector('[data-headline="false-asks"]')
    expect(headline?.textContent).toBe(`${HEADLINE_POLICY} ${tally?.asked} of ${tally?.of}.`)
    expect(
      (tally?.byPairRule ?? 0) + (tally?.byThreshold ?? 0) + (tally?.byStandingReadBack ?? 0),
      "every correct drug name is asked about exactly once, by one of three routes",
    ).toBe(tally?.of)
    expect(screen.getAllByText(tally?.command ?? "missing").length).toBeGreaterThan(0)
  })

  it("renders dashes, not zeroes, when no run supplies the tally", () => {
    render(<FalseAskHeadline tally={null} />)
    const headline = document.querySelector<HTMLElement>('[data-headline="false-asks"]')
    expect(headline?.textContent).not.toMatch(/[0-9]/)
    expect(headline === null ? false : isDash(headline)).toBe(true)
  })

  it("names the test that ties published totals to the raw runs, and that test exists", () => {
    render(<MetricsPage />)
    expect(screen.getByText(/Published totals match raw runs/)).toBeDefined()
    expect(screen.getByText(RAW_RUN_AGREEMENT_TEST)).toBeDefined()
    expect(
      existsSync(RAW_RUN_AGREEMENT_TEST),
      "the page must not cite a test that is gone",
    ).toBe(true)
  })
})

describe("the business reading publishes no invented number", () => {
  it("shows a dash and not measured yet for every figure without a measured input", () => {
    render(<OperationsPage />)
    for (const figure of BUSINESS_FIGURES) {
      expect(figure.value, `${figure.id} has no measured input behind it`).toBeNull()
      const item = document.querySelector<HTMLElement>(`[data-figure="${figure.id}"]`)
      expect(item === null ? false : isDash(item), figure.id).toBe(true)
      expect(item?.textContent).toContain(NOT_MEASURED_YET)
    }
    expect(screen.getByText(/pharmacist seconds per order/)).toBeDefined()
    expect(screen.getByText(/catches per 1000 orders/)).toBeDefined()
  })

  it("refuses a cost-of-error figure without a cited source", () => {
    render(<OperationsPage />)
    expect(screen.getByText(/No cost of a dispensing error is shown/)).toBeDefined()
    const reading = document.querySelectorAll("[data-figure]")
    for (const item of reading) {
      expect(item.textContent ?? "").not.toMatch(/\$|USD/)
    }
  })
})

describe("a stacked benchmark row reads as a card", () => {
  it("quiets the interval beside its point estimate without changing the published text", () => {
    const entry: BenchmarkEntry = {
      ...UNMEASURED,
      id: "planted-interval",
      row: {
        ...UNMEASURED.row,
        value: "26.7% [17.1%, 39.0%]",
        n: 60,
        measuredOn: "2026-09-01",
      },
    }
    render(<BenchmarkTable entries={[entry]} />)
    const value = cell(rowFor(entry.id), "value")
    expect(value.textContent).toBe("26.7% [17.1%, 39.0%]")
    const interval = within(value).getByText("[17.1%, 39.0%]")
    expect(interval.className).not.toBe("")
    expect(
      within(cell(rowFor(entry.id), "input")).getByText(INPUT_LABEL["live socket"]),
    ).toBeDefined()
  })
})
