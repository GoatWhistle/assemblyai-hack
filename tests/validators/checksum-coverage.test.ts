import { describe, expect, it } from "vitest"
import { coverage } from "../../scripts/measure/audit-checksums"

const rows = coverage(40)

function row(match: string) {
  const found = rows.find((entry) => entry.label.startsWith(match))
  if (found === undefined) {
    throw new Error(`no coverage row for ${match}`)
  }
  return found
}

describe("what the arithmetic validators actually catch", () => {
  it("catches every single-digit substitution in an NPI", () => {
    const npi = row("NPI")
    expect(npi.substitutionsTotal).toBeGreaterThan(0)
    expect(
      npi.substitutionsCaught / npi.substitutionsTotal,
      "Luhn over the 80840 prefix is complete for single-digit errors; a change that weakens this must fail here",
    ).toBe(1)
  })

  it("does not catch every single-digit substitution in a DEA number", () => {
    const dea = row("DEA")
    const rate = dea.substitutionsCaught / dea.substitutionsTotal
    expect(
      rate,
      "the mod-10 DEA scheme is weaker than Luhn, and the project claimed both were equally provable; this test exists so the claim cannot quietly become true again",
    ).toBeLessThan(1)
    expect(
      rate,
      "if DEA coverage drops well below the measured value, something regressed",
    ).toBeGreaterThan(0.9)
  })

  it("keeps NPI transposition coverage below completeness, which is the honest weakness of Luhn", () => {
    const npi = row("NPI")
    expect(npi.transpositionsTotal).toBeGreaterThan(0)
    expect(
      npi.transpositionsCaught / npi.transpositionsTotal,
      "Luhn misses the 0-9 adjacent transposition; claiming otherwise would overstate the field",
    ).toBeLessThan(1)
  })

  it("catches every adjacent transposition in a DEA number", () => {
    const dea = row("DEA")
    expect(dea.transpositionsTotal).toBeGreaterThan(0)
    expect(dea.transpositionsCaught / dea.transpositionsTotal).toBe(1)
  })
})
