import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Limits } from "@/features/how-it-works/limits"
import { ismpPairCount, LASA_PAIRS } from "@/lasa"

describe("the pair table limit stated on how-it-works", () => {
  it("names the curated count and the parsed list's count, both from code", () => {
    render(<Limits />)
    const body = screen.getByText(/hand-curated table/i)
    expect(
      body.textContent,
      "CLAUDE.md requires saying the curated count from LASA_PAIRS in anything a judge reads, and forbids quoting the abandoned ~240 design target",
    ).toContain(`${LASA_PAIRS.length} pairs`)
    expect(body.textContent).toContain(`${ismpPairCount()} pairs parsed from the published PDF`)
  })

  it("says the full list is the product rule and the curated table the evaluation core", () => {
    render(<Limits />)
    const body = screen.getByText(/hand-curated table/i).textContent ?? ""
    expect(body).toMatch(/pair rule applies the full 2023 ISMP List/)
    expect(body).toMatch(/applied, not separately evaluated/)
    expect(
      body,
      "AU6-P1-16: the list is reachable and parsed, so the copy must not say it has no stable URL",
    ).not.toMatch(/stable public URL|falls back/i)
  })
})
