import { describe, expect, it } from "vitest"
import { VerdictOutcome } from "@/domain"
import { findSigProblems, ISMP_DO_NOT_USE, validateSig } from "@/validators"

describe("sig abbreviations", () => {
  it("passes fully written directions", () => {
    const verdict = validateSig("1 tablet by mouth once daily")
    expect(verdict.outcome).toBe(VerdictOutcome.Passed)
    expect(verdict.evidence.findingCount).toBe(0)
  })

  it("catches qd and its dotted form", () => {
    for (const sig of ["1 tab po qd", "1 tablet q.d.", "take one qd"]) {
      const verdict = validateSig(sig)
      expect(verdict.outcome, sig).toBe(VerdictOutcome.FormatInvalid)
    }
  })

  it("catches the unit abbreviations that cause tenfold errors", () => {
    for (const sig of ["10 U subcutaneous", "5 IU daily", "give 10 cc", "50 ug daily"]) {
      expect(validateSig(sig).outcome, sig).toBe(VerdictOutcome.FormatInvalid)
    }
  })

  it("catches the ear and eye abbreviations", () => {
    for (const sig of ["2 drops AD", "1 drop AS", "2 drops AU", "1 drop OS", "2 drops OU"]) {
      expect(validateSig(sig).outcome, sig).toBe(VerdictOutcome.FormatInvalid)
    }
  })

  it("catches a trailing zero", () => {
    const findings = findSigProblems("1.0 mg by mouth daily")
    expect(findings.some((f) => f.found === "1.0")).toBe(true)
    expect(validateSig("1.0 mg by mouth daily").outcome).toBe(VerdictOutcome.FormatInvalid)
  })

  it("catches a naked decimal", () => {
    const findings = findSigProblems("take .5 mg daily")
    expect(findings.some((f) => f.found === ".5")).toBe(true)
  })

  it("catches the morphine and magnesium sulfate abbreviations", () => {
    for (const sig of ["MS 10 mg", "MSO4 4 mg", "MgSO4 2 g"]) {
      expect(validateSig(sig).outcome, sig).toBe(VerdictOutcome.FormatInvalid)
    }
  })

  it("catches the symbols that read as digits", () => {
    for (const sig of ["1 tablet + 1 capsule", "take 2 & 2", "1 tablet @ bedtime"]) {
      expect(validateSig(sig).outcome, sig).toBe(VerdictOutcome.FormatInvalid)
    }
  })

  it("catches the remaining scheduling abbreviations", () => {
    for (const sig of [
      "1 tab qod",
      "1 tab TIW",
      "1 tab HS",
      "inject SQ",
      "D/C the drug",
      "x3d",
    ]) {
      expect(validateSig(sig).outcome, sig).toBe(VerdictOutcome.FormatInvalid)
    }
  })

  it("names what each finding is confused with and what to use instead", () => {
    const verdict = validateSig("1 tab po qd")
    expect(String(verdict.evidence.confusedWith).length).toBeGreaterThan(0)
    expect(String(verdict.evidence.instead)).toContain("daily")
  })

  it("carries at least 25 hand typed entries", () => {
    expect(ISMP_DO_NOT_USE.length).toBeGreaterThanOrEqual(25)
  })

  it("cites the ismp list edition", () => {
    expect(validateSig("1 tab qd").ruleCited).toContain(
      "ISMP Error-Prone Abbreviations 2024-04",
    )
  })

  it("does not fire on a word that merely contains an abbreviation", () => {
    for (const sig of ["1 tablet by mouth", "administer as directed", "use cautiously"]) {
      expect(validateSig(sig).outcome, sig).toBe(VerdictOutcome.Passed)
    }
  })
})
