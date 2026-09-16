import { describe, expect, it } from "vitest"
import { VerdictOutcome } from "@/domain"
import { normalizeDea, validateDea } from "@/validators"

describe("dea mod10", () => {
  it("passes AB1234563", () => {
    const verdict = validateDea("AB1234563")
    expect(verdict.outcome).toBe(VerdictOutcome.Passed)
    expect(verdict.evidence.sum).toBe(33)
    expect(verdict.evidence.computed).toBe(3)
    expect(verdict.evidence.given).toBe(3)
  })

  it("rejects BX1234567", () => {
    const verdict = validateDea("BX1234567")
    expect(verdict.outcome).toBe(VerdictOutcome.FailedChecksum)
    expect(verdict.evidence.computed).toBe(3)
    expect(verdict.evidence.given).toBe(7)
  })

  it("uppercases the letters", () => {
    expect(normalizeDea("ab1234563")).toBe("AB1234563")
    expect(validateDea("ab1234563").outcome).toBe(VerdictOutcome.Passed)
    expect(validateDea("ab1234563").evidence.letters).toBe("AB")
  })

  it("rejects a shape that is not two letters and seven digits", () => {
    for (const bad of ["A1234563", "ABC123456", "AB12345", "1234567AB"]) {
      expect(validateDea(bad).outcome, bad).toBe(VerdictOutcome.FormatInvalid)
    }
  })

  it("reports the odd and even sums as evidence", () => {
    const verdict = validateDea("AB1234563")
    expect(verdict.evidence.odd).toBe(9)
    expect(verdict.evidence.even).toBe(12)
  })

  it("cites the arithmetic rule", () => {
    expect(validateDea("AB1234563").ruleCited).toContain("(d1+d3+d5) + 2*(d2+d4+d6)")
  })
})
