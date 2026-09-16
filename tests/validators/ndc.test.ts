import { describe, expect, it } from "vitest"
import { VerdictOutcome } from "@/domain"
import { validateNdcFormat } from "@/validators"

describe("ndc format", () => {
  it("accepts the three ten digit layouts", () => {
    for (const [value, shape] of [
      ["1234-5678-90", "4-4-2"],
      ["12345-678-90", "5-3-2"],
      ["12345-6789-0", "5-4-1"],
    ] as const) {
      const verdict = validateNdcFormat(value)
      expect(verdict.outcome, value).toBe(VerdictOutcome.Passed)
      expect(verdict.evidence.shape).toBe(shape)
      expect(verdict.evidence.digitCount).toBe(10)
    }
  })

  it("accepts an eleven digit 5-4-2 layout", () => {
    const verdict = validateNdcFormat("12345-6789-01")
    expect(verdict.outcome).toBe(VerdictOutcome.Passed)
    expect(verdict.evidence.shape).toBe("5-4-2")
  })

  it("rejects an eleven digit code that is not 5-4-2", () => {
    const verdict = validateNdcFormat("1234-56789-01")
    expect(verdict.outcome).toBe(VerdictOutcome.FormatInvalid)
    expect(verdict.evidence.expected).toBe("5-4-2")
  })

  it("rejects a non numeric or wrongly grouped code", () => {
    for (const bad of ["12345678901", "abcd-efgh-ij", "123-456", "12345-6789-012"]) {
      expect(validateNdcFormat(bad).outcome, bad).toBe(VerdictOutcome.FormatInvalid)
    }
  })

  it("never claims an ndc carries a check digit", () => {
    const verdict = validateNdcFormat("12345-6789-01")
    expect(verdict.detail).toContain("no check digit")
    expect(verdict.evidence.hasCheckDigit).toBe(false)
    expect(verdict.detail.toLowerCase()).not.toContain("checksum")
  })
})
