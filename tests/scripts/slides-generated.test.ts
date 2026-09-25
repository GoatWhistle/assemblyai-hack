import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { deckMarkdown } from "../../scripts/report/deck-markdown"

function lf(text: string): string {
  return text.replace(/\r\n/g, "\n")
}

describe("docs/slides.md is the deck, generated, and cannot drift from it", () => {
  it("equals what make deck-markdown renders from src/features/deck/slides.ts", () => {
    expect(
      lf(readFileSync("docs/slides.md", "utf8")),
      "docs/slides.md was edited by hand or the deck changed without make deck-markdown; edit the deck and regenerate",
    ).toBe(lf(deckMarkdown()))
  })

  it("renders every slide of the deck, so an empty render cannot pass as agreement", () => {
    const rendered = deckMarkdown()
    expect(rendered).toMatch(/^# Readback: slide contents/)
    expect((rendered.match(/^## \d+\. /gm) ?? []).length).toBeGreaterThan(10)
  })
})
