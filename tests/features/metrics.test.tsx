import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { closeCodeRows } from "@/features/metrics/close-code-tally"
import { confidenceFigures, errorRateFigures } from "@/features/metrics/measured-figures"
import { GATE_METRICS, LATENCY_METRICS } from "@/features/metrics/metric-definitions"
import { MetricsDashboard } from "@/features/metrics/metrics-dashboard"
import { allScored, closeCodeCounts } from "@/features/metrics/recorded-runs"
import { NOT_MEASURED } from "@/shared/ui/data-display/figure-with-method"

describe("every metric carries a method", () => {
  it("gives each figure a command and a set description", () => {
    for (const metric of [...GATE_METRICS, ...LATENCY_METRICS]) {
      expect(metric.command.length).toBeGreaterThan(0)
      expect(metric.setDescription.length).toBeGreaterThan(0)
      expect(metric.meaning.length).toBeGreaterThan(0)
    }
  })

  it("renders an unmeasured figure as not measured yet rather than as a zero", () => {
    render(<MetricsDashboard />)
    expect(screen.getAllByText(NOT_MEASURED).length).toBe(
      GATE_METRICS.length + LATENCY_METRICS.length,
    )
  })

  it("prints the command beside each figure", () => {
    render(<MetricsDashboard />)
    expect(screen.getAllByText("make eval").length).toBe(GATE_METRICS.length)
    expect(screen.getAllByText("make measure").length).toBe(LATENCY_METRICS.length)
  })
})

describe("the false-ask rate is first class", () => {
  it("appears as its own figure, not a footnote", () => {
    render(<MetricsDashboard />)
    expect(screen.getByText("False-ask rate")).toBeDefined()
  })

  it("is described as the cost side of the gate", () => {
    const metric = GATE_METRICS.find((entry) => entry.id === "false-ask-rate")
    expect(metric?.meaning).toContain("cost side")
    expect(metric?.meaning).toContain("re-asks constantly")
  })

  it("sits alongside the catch rate rather than replacing it", () => {
    render(<MetricsDashboard />)
    expect(screen.getByText("LASA catch rate")).toBeDefined()
    expect(screen.getByText("Accepted-wrong count")).toBeDefined()
  })
})

describe("latency honesty", () => {
  it("labels the word-to-gate figure as a browser measurement", () => {
    const metric = LATENCY_METRICS.find((entry) => entry.id === "word-to-gate")
    expect(metric?.meaning).toContain("browser measurement")
  })

  it("labels the server figure as coming from the sessions endpoint", () => {
    const metric = LATENCY_METRICS.find((entry) => entry.id === "time-to-first-audio")
    expect(metric?.meaning).toContain("/v1/sessions/")
  })
})

describe("close codes are counted, not asserted", () => {
  it("publishes only codes that a recorded run actually produced", () => {
    const rows = closeCodeRows()
    expect(
      rows.length,
      "the table used to declare 3007, 3008 and 3009 with count 0, which is a number without a method; it must now come from the recorded files",
    ).toBeGreaterThan(0)
    const observed = new Set(allScored().map((entry) => entry.closeCode))
    for (const row of rows) {
      expect(observed.has(row.code), `${row.code} is published but never observed`).toBe(true)
    }
  })

  it("has every count sum to the number of recorded sessions", () => {
    const total = closeCodeRows().reduce((sum, row) => sum + row.count, 0)
    expect(total).toBe(allScored().length)
  })

  it("does not publish a count of zero for anything", () => {
    for (const row of closeCodeRows()) {
      expect(
        row.count,
        `${row.code} is published with no observation behind it`,
      ).toBeGreaterThan(0)
    }
  })

  it("marks a rate-limit close as alert-worthy if one was ever recorded", () => {
    const rows = closeCodeRows()
    for (const row of rows) {
      if (row.code === 1008 || row.code === 3008 || row.code === 3009) {
        expect(row.alertWorthy, `${row.code} burns credit and must alert`).toBe(true)
      }
    }
    expect(closeCodeCounts().length).toBeGreaterThan(0)
  })

  it("renders one row per observed code", () => {
    render(<MetricsDashboard />)
    for (const row of closeCodeRows()) {
      const cells = screen
        .getAllByRole("cell")
        .filter((cell) => cell.textContent?.startsWith(String(row.code)))
      expect(cells.length, `${row.code}`).toBe(1)
    }
  })
})

describe("measured figures reach the screen", () => {
  it("publishes an error rate for every recorded run, with its command", () => {
    const figures = errorRateFigures()
    expect(figures.length).toBeGreaterThanOrEqual(3)
    for (const figure of figures) {
      expect(figure.value, figure.name).not.toBeNull()
      expect(figure.command.length).toBeGreaterThan(0)
      expect(figure.setDescription).toMatch(/[0-9]+ utterances/)
    }
  })

  it("states how many errors the recognizer was confident about", () => {
    const figure = confidenceFigures().find((entry) => entry.id === "errors-above-threshold")
    expect(figure).toBeDefined()
    expect(
      figure?.value,
      "this is the number the whole product rests on and it must not render as not measured",
    ).toMatch(/^[0-9]+ of [0-9]+$/)
  })

  it("renders those figures rather than leaving the page all placeholders", () => {
    render(<MetricsDashboard />)
    expect(screen.getByText(/Why confidence is not the check/i)).toBeDefined()
    expect(screen.getByText(/What the recognizer got wrong/i)).toBeDefined()
  })
})

describe("held-out discipline is stated on the page", () => {
  it("says thresholds are tuned on the development set only", () => {
    render(<MetricsDashboard />)
    expect(screen.getByText(/tuned on the development set only/i)).toBeDefined()
  })

  it("says a number without a method is not published", () => {
    render(<MetricsDashboard />)
    expect(screen.getByText(/A number without a method is not published here/i)).toBeDefined()
  })

  it("says at section level why a blank section is blank", () => {
    render(<MetricsDashboard />)
    expect(
      screen.getByText(/blank on purpose: the set is sealed, not unrun/i),
      "five rows of not measured yet read as an unfinished page unless the section says the set is sealed, which is the discipline rather than a gap",
    ).toBeDefined()
    expect(screen.getByText(/blank until a paid run/i)).toBeDefined()
  })

  it("distinguishes an unrun measurement from a sealed one in the lede", () => {
    render(<MetricsDashboard />)
    expect(
      screen.getByText(/the run has not happened or the set is sealed/i),
      "not measured yet covers two different states and a judge cannot tell them apart without being told",
    ).toBeDefined()
  })
})
