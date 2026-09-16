import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Certainty, formatCertainty, TICK_COUNT } from "@/shared/ui/data-display/certainty"

describe("Certainty presentation", () => {
  it("reads as a two-decimal certainty rather than a percentage score", () => {
    render(<Certainty minConfidence={0.92} threshold={0.95} />)
    expect(screen.getByText(/0\.92 min over span/)).toBeDefined()
    expect(formatCertainty(0.92)).toBe("0.92")
  })

  it("attributes the number to the recognizer rather than stating it as fact", () => {
    render(<Certainty minConfidence={0.99} threshold={0.95} />)
    expect(screen.getByText("Recognizer said, of itself")).toBeDefined()
  })

  it("says the number is the minimum over the span, not an average", () => {
    render(<Certainty minConfidence={0.42} threshold={0.95} />)
    expect(screen.getByText(/min over span/)).toBeDefined()
  })

  it("describes the number's limit in the caveat by default", () => {
    render(<Certainty minConfidence={0.99} threshold={0.95} />)
    expect(screen.getByText(/It cannot tell one real word from another/)).toBeDefined()
  })

  it("exposes both the reading and the threshold to assistive technology", () => {
    render(<Certainty minConfidence={0.87} threshold={0.92} />)
    const label = screen.getByRole("img").getAttribute("aria-label") ?? ""
    expect(label).toContain("0.87")
    expect(label).toContain("0.92")
    expect(label).toContain("self-reported")
  })

  it("marks the threshold on the track rather than declaring a pass or fail", () => {
    render(<Certainty minConfidence={0.99} threshold={0.95} />)
    expect(screen.getByText("field threshold 0.95 marked on the track")).toBeDefined()
  })

  it("renders a fixed number of discrete ticks, so it reads as a reading not a bar", () => {
    const { container } = render(<Certainty minConfidence={0.5} threshold={0.9} />)
    expect(container.querySelectorAll("[class*='tick']").length).toBeGreaterThanOrEqual(
      TICK_COUNT,
    )
  })

  it("replaces the caveat with the reason when it is outranked", () => {
    render(
      <Certainty
        minConfidence={0.99}
        threshold={0.95}
        overruled
        overruledBy="Outranked by a published look-alike pair."
      />,
    )
    expect(screen.getByText("Outranked by a published look-alike pair.")).toBeDefined()
    expect(screen.queryByText(/It cannot tell one real word/)).toBeNull()
  })

  it("still shows the reading when outranked, rather than hiding the inconvenient number", () => {
    render(<Certainty minConfidence={1} threshold={0.95} overruled overruledBy="Outranked." />)
    expect(screen.getByText(/1\.00 min over span/)).toBeDefined()
  })

  it("handles the boundary values without breaking", () => {
    for (const value of [0, 1]) {
      const { unmount } = render(<Certainty minConfidence={value} threshold={0.9} />)
      expect(screen.getByRole("img")).toBeDefined()
      unmount()
    }
  })
})
