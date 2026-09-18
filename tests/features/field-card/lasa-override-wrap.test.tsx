import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const SHEET = readFileSync("src/features/field-card/lasa-override/styles.module.css", "utf8")

function ruleBodyOf(selector: string): string {
  const match = SHEET.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`))
  return match?.[1] ?? ""
}

describe("lasa override heading layout", () => {
  it("lets the pair chip and the heading text wrap onto separate lines", () => {
    const rule = ruleBodyOf("overrideHead")
    expect(
      rule,
      "overrideHead is display: flex with no wrap: at narrow widths the fixed-width chip squeezes the heading span down to under 100px, breaking every word onto its own line. This was measured live at 375px before the fix",
    ).toMatch(/flex-wrap:\s*wrap/)
  })
})
