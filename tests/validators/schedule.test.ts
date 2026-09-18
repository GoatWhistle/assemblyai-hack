import { describe, expect, it } from "vitest"
import { VerdictOutcome } from "@/domain"
import { NO_REFILL_SCHEDULE, validateRefillSchedule } from "@/validators"

describe("the federal refill prohibition", () => {
  it("refuses any refill on a Schedule II drug", () => {
    const verdict = validateRefillSchedule({
      refills: 1,
      deaSchedule: NO_REFILL_SCHEDULE,
      drugName: "morphine sulfate",
    })
    expect(
      verdict.outcome,
      "a Schedule II prescription may not be refilled at all, so even one is refused",
    ).toBe(VerdictOutcome.FormatInvalid)
    expect(verdict.ruleCited).toContain("1306.12")
  })

  it("accepts zero refills on a Schedule II drug", () => {
    const verdict = validateRefillSchedule({
      refills: 0,
      deaSchedule: "CII",
      drugName: "oxycodone hydrochloride",
    })
    expect(verdict.outcome).toBe(VerdictOutcome.Passed)
  })

  it("does not extend the prohibition to schedules it does not cover", () => {
    for (const schedule of ["CIII", "CIV", "CV"]) {
      const verdict = validateRefillSchedule({
        refills: 5,
        deaSchedule: schedule,
        drugName: "alprazolam",
      })
      expect(
        verdict.outcome,
        `${schedule} is not covered by the Schedule II refill prohibition; inventing a rule for it would be a false refusal`,
      ).toBe(VerdictOutcome.Passed)
    }
  })

  it("stands aside for a drug with no schedule, rather than guessing", () => {
    const verdict = validateRefillSchedule({
      refills: 5,
      deaSchedule: null,
      drugName: "lisinopril",
    })
    expect(verdict.outcome).toBe(VerdictOutcome.NotApplicable)
  })

  it("reads a lowercase or padded schedule the same way", () => {
    const verdict = validateRefillSchedule({
      refills: 2,
      deaSchedule: " cii ",
      drugName: "fentanyl",
    })
    expect(verdict.outcome).toBe(VerdictOutcome.FormatInvalid)
  })

  it("names the drug and the number it heard, so the refusal is checkable", () => {
    const verdict = validateRefillSchedule({
      refills: 3,
      deaSchedule: "CII",
      drugName: "methylphenidate hydrochloride",
    })
    expect(verdict.detail).toContain("methylphenidate hydrochloride")
    expect(verdict.detail).toContain("3")
    expect(verdict.evidence).toMatchObject({ deaSchedule: "CII", allowed: 0 })
  })
})
