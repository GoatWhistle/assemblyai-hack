import { describe, expect, it } from "vitest"
import { VerdictOutcome } from "@/domain"
import { normalizeNpi, validateNpi } from "@/validators"

describe("npi luhn", () => {
  it("passes 1234567893", () => {
    const verdict = validateNpi("1234567893")
    expect(verdict.outcome).toBe(VerdictOutcome.Passed)
    expect(verdict.evidence.sum).toBe(67)
    expect(verdict.evidence.computed).toBe(3)
    expect(verdict.evidence.given).toBe(3)
    expect(verdict.detail).toBe("sum=67, computed check digit 3, given 3")
  })

  it("passes 1245319599", () => {
    const verdict = validateNpi("1245319599")
    expect(verdict.outcome).toBe(VerdictOutcome.Passed)
    expect(verdict.evidence.computed).toBe(9)
    expect(verdict.evidence.given).toBe(9)
  })

  it("rejects 1234567890", () => {
    const verdict = validateNpi("1234567890")
    expect(verdict.outcome).toBe(VerdictOutcome.FailedChecksum)
    expect(verdict.evidence.computed).toBe(3)
    expect(verdict.evidence.given).toBe(0)
  })

  it("cites the 80840 prefix rule", () => {
    expect(validateNpi("1234567893").ruleCited).toContain("80840")
    expect(validateNpi("1234567893").evidence.prefix).toBe("80840")
  })

  it("rejects a wrong length as a format problem, not a checksum problem", () => {
    const verdict = validateNpi("12345")
    expect(verdict.outcome).toBe(VerdictOutcome.FormatInvalid)
    expect(verdict.evidence.digitCount).toBe(5)
  })

  it("strips separators before checking", () => {
    expect(normalizeNpi("1-234-567-893")).toBe("1234567893")
    expect(validateNpi("1-234-567-893").outcome).toBe(VerdictOutcome.Passed)
  })

  it("names the validator and the checked value", () => {
    const verdict = validateNpi("1245319599")
    expect(verdict.validatorName).toBe("npi_luhn")
    expect(verdict.checkedValue).toBe("1245319599")
  })
})
