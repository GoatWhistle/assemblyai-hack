import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ABSENT_MARK, Figure, FigureGroup, NOT_MEASURED } from "@/shared/ui/data-display/figure"
import { Method, sizeLabel } from "@/shared/ui/data-display/method"

describe("Figure", () => {
  it("shows a value with its interval, label, unit and method", () => {
    const { container } = render(
      <FigureGroup label="Held-out figures">
        <Figure
          figureKey="error-rate"
          label="Entity error rate"
          unit="held-out set"
          value="26.7%"
          interval="[17.1%, 39.0%]"
          method={{ command: "make eval-heldout", n: 60, set: "eval/heldout" }}
        />
      </FigureGroup>,
    )
    const figure = container.querySelector<HTMLElement>('[data-figure="error-rate"]')
    expect(figure).not.toBeNull()
    const scope = within(figure as HTMLElement)
    expect(scope.getByText("26.7%")).toBeDefined()
    expect(scope.getByText("[17.1%, 39.0%]")).toBeDefined()
    expect(scope.getByText("held-out set")).toBeDefined()
    expect(scope.getByText("make eval-heldout")).toBeDefined()
    expect(scope.getByText("n = 60")).toBeDefined()
    expect(screen.getByRole("term").textContent).toContain("Entity error rate")
  })

  it("renders an absent value as a labelled dash, never a zero, and drops the interval", () => {
    const { container } = render(
      <FigureGroup>
        <Figure label="Re-ask cost" value={null} interval="[0, 1]" note="not measured yet" />
      </FigureGroup>,
    )
    const dash = screen.getByRole("img", { name: NOT_MEASURED })
    expect(dash.textContent).toBe(ABSENT_MARK)
    expect(container.textContent).not.toMatch(/[0-9]/)
  })
})

describe("Method", () => {
  it("prints the command, then n, then the set, in one order everywhere", () => {
    const { container } = render(<Method command="make ab-gate" n={20} set="text candidates" />)
    expect(container.textContent).toBe("make ab-gate n = 20, text candidates")
    expect(sizeLabel(59)).toBe("n = 59")
  })

  it("omits the size when no set size is known rather than inventing one", () => {
    const { container } = render(<Method command="make measure" />)
    expect(container.textContent).toBe("make measure")
  })
})
