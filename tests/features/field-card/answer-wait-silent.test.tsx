import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AnswerWait } from "@/features/field-card/answer-wait"

describe("AU12: a ticking count is not a live region", () => {
  it("keeps the per-second answer timer out of the screen reader's queue", () => {
    render(<AnswerWait sinceMs={0} now={() => 4000} />)
    const timer = screen.getByText(/Waiting 4 s for the caller/)
    expect(
      timer.getAttribute("aria-live"),
      "an output element is polite by default, so a count that changes every second would be read every second",
    ).toBe("off")
  })
})
