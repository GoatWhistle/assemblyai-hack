import { describe, expect, it } from "vitest"
import { FieldName, VerdictOutcome } from "@/domain"
import { boundsFor, validateRange } from "@/validators"

describe("range check", () => {
  it("bounds quantity at 1 to 360", () => {
    expect(boundsFor(FieldName.Quantity)).toEqual({ min: 1, max: 360 })
    expect(validateRange(FieldName.Quantity, 1).outcome).toBe(VerdictOutcome.Passed)
    expect(validateRange(FieldName.Quantity, 360).outcome).toBe(VerdictOutcome.Passed)
    expect(validateRange(FieldName.Quantity, 0).outcome).toBe(VerdictOutcome.FormatInvalid)
    expect(validateRange(FieldName.Quantity, 361).outcome).toBe(VerdictOutcome.FormatInvalid)
  })

  it("bounds refills at 0 to 11", () => {
    expect(boundsFor(FieldName.Refills)).toEqual({ min: 0, max: 11 })
    expect(validateRange(FieldName.Refills, 0).outcome).toBe(VerdictOutcome.Passed)
    expect(validateRange(FieldName.Refills, 11).outcome).toBe(VerdictOutcome.Passed)
    expect(validateRange(FieldName.Refills, 12).outcome).toBe(VerdictOutcome.FormatInvalid)
    expect(validateRange(FieldName.Refills, -1).outcome).toBe(VerdictOutcome.FormatInvalid)
  })

  it("bounds days supply at 1 to 90", () => {
    expect(boundsFor(FieldName.DaysSupply)).toEqual({ min: 1, max: 90 })
    expect(validateRange(FieldName.DaysSupply, 90).outcome).toBe(VerdictOutcome.Passed)
    expect(validateRange(FieldName.DaysSupply, 91).outcome).toBe(VerdictOutcome.FormatInvalid)
  })

  it("rejects a non integer", () => {
    expect(validateRange(FieldName.Quantity, 30.5).outcome).toBe(VerdictOutcome.FormatInvalid)
    expect(validateRange(FieldName.Quantity, "thirty").outcome).toBe(
      VerdictOutcome.FormatInvalid,
    )
  })

  it("is not applicable to a field with no range", () => {
    const verdict = validateRange(FieldName.DrugName, 5)
    expect(verdict.outcome).toBe(VerdictOutcome.NotApplicable)
  })

  it("reports the bounds as evidence", () => {
    const verdict = validateRange(FieldName.Quantity, 500)
    expect(verdict.evidence.min).toBe(1)
    expect(verdict.evidence.max).toBe(360)
    expect(verdict.evidence.inRange).toBe(false)
  })
})
