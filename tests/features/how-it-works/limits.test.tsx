import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Limits } from "@/features/how-it-works/limits"
import { LASA_PAIRS } from "@/lasa/pairs"

describe("the pair table limit stated on how-it-works", () => {
  it("names the real curated count rather than a stale extraction figure", () => {
    render(<Limits />)
    const body = screen.getByText(/hand-curated table/i)
    expect(
      body.textContent,
      "CLAUDE.md requires saying '20 curated pairs' in anything a judge reads, and forbids quoting the abandoned ~240 design target as if it were measured; this line once said 'roughly 960', a number nobody produced",
    ).toContain(`${LASA_PAIRS.length} pairs`)
  })

  it("does not claim the published list was parsed", () => {
    render(<Limits />)
    const body = screen.getByText(/hand-curated table/i)
    expect(
      body.textContent,
      "the ECRI source has no stable public URL, so the build falls back to the curated table rather than extracting pairs from a live parse; the copy must not imply a parse happened",
    ).not.toMatch(/extracted from/i)
  })
})
