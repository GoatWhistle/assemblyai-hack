import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GateBanner } from "@/features/gate-banner"
import { describeReason } from "@/features/gate-banner/reason-language"
import { LASA_CANDIDATE, LASA_DECISION } from "@/features/judge-demo/scenario"

describe("AU12: a new verdict is announced through a live region that was already there", () => {
  it("keeps the same polite region from the idle state to the verdict", () => {
    const { container, rerender } = render(<GateBanner decision={null} />)
    const region = container.firstElementChild
    expect(region?.getAttribute("aria-live")).toBe("polite")
    rerender(<GateBanner decision={LASA_DECISION} candidate={LASA_CANDIDATE} />)
    expect(
      container.firstElementChild,
      "a live region inserted together with its text is not reliably read; the verdict has to land inside one that existed before",
    ).toBe(region)
    expect(region?.textContent).toContain(describeReason(LASA_DECISION.reasonCode).headline)
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite")
  })
})
