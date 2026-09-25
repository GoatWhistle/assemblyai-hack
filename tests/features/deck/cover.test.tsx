import CoverPage, { metadata } from "@app/(pages)/cover/page"
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(() => {
  cleanup()
})

describe("the submission cover", () => {
  it("names the product and states the thesis", () => {
    render(<CoverPage />)
    expect(screen.getByText("Readback")).toBeTruthy()
    expect(
      screen.getByRole("heading", { level: 1 }).textContent,
      "the cover is the first thing a judge sees; without the thesis it is a logo, not an argument",
    ).toMatch(/proves it did not mishear/)
  })

  it("shows a certain recognizer overridden by the gate with both candidates", () => {
    render(<CoverPage />)
    const moment = screen.getByRole("figure")
    expect(within(moment).getByText("certainty 1.00")).toBeTruthy()
    expect(
      within(moment).getByText("RE-ASK"),
      "the signature moment is the re-ask at full certainty; a cover without it shows nothing the product does",
    ).toBeTruthy()
    expect(within(moment).getByText(/published look-alike pair/i)).toBeTruthy()
    const candidates = within(within(moment).getByRole("list")).getAllByRole("listitem")
    expect(candidates.map((item) => item.textContent)).toEqual(["Hydromorphone", "Morphine"])
  })

  it("labels the certain recognizer output as staged, beside the recognizer itself", () => {
    render(<CoverPage />)
    const moment = screen.getByRole("figure")
    const label = within(moment).getByText("staged example")
    expect(
      label.parentElement?.textContent,
      "no recognizer run produced morphine at 1.00 for hydromorphone; the label has to sit where the number is read, not in a footnote",
    ).toContain("Recognizer")
  })

  it("carries the medical disclaimer", () => {
    render(<CoverPage />)
    expect(
      screen.getByText("Technology demonstration, not a medical device. Synthetic data only."),
      "an image that travels without the page must still say it is not a medical device",
    ).toBeTruthy()
  })

  it("is kept out of search indexes", () => {
    expect(metadata.robots).toEqual({ index: false })
  })
})
