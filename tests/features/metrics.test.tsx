import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  CLOSE_CODE_ROWS,
  GATE_METRICS,
  LATENCY_METRICS,
} from "@/features/metrics/metric-definitions"
import { MetricsDashboard } from "@/features/metrics/metrics-dashboard"
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

describe("close codes", () => {
  it("gives 3007, 3008 and 3009 their own lines", () => {
    render(<MetricsDashboard />)
    for (const code of ["3007", "3008", "3009"]) {
      const cells = screen
        .getAllByRole("cell")
        .filter((cell) => cell.textContent?.startsWith(code))
      expect(cells.length).toBe(1)
    }
  })

  it("marks only the two money-burning codes as alert-worthy", () => {
    const alerting = CLOSE_CODE_ROWS.filter((row) => row.alertWorthy).map((row) => row.code)
    expect(alerting).toEqual([3008, 3009])
    render(<MetricsDashboard />)
    expect(screen.getAllByText("alert").length).toBe(2)
  })

  it("explains what each code means rather than printing a bare number", () => {
    render(<MetricsDashboard />)
    expect(screen.getByText(/50-1000 ms window/i)).toBeDefined()
    expect(screen.getByText(/five new sessions/i)).toBeDefined()
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
})
