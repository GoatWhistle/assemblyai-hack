import { describe, expect, it } from "vitest"
import { VerdictOutcome } from "@/domain"
import { type ComboQuery, type ComboSource, validateCombo } from "@/validators"

const CATALOGUE: Readonly<
  Record<string, readonly { strength: string; dosageForm: string; route: string }[]>
> = {
  lisinopril: [
    { strength: "10 mg", dosageForm: "TABLET", route: "ORAL" },
    { strength: "20 mg", dosageForm: "TABLET", route: "ORAL" },
  ],
}

const source: ComboSource = {
  comboExists: (q: ComboQuery) =>
    (CATALOGUE[q.drugName] ?? []).some(
      (c) =>
        c.strength.toLowerCase() === q.strength.toLowerCase() &&
        c.dosageForm.toLowerCase() === q.dosageForm.toLowerCase() &&
        c.route.toLowerCase() === q.route.toLowerCase(),
    ),
  combosFor: (drugName: string) => CATALOGUE[drugName] ?? [],
}

describe("combo consistency", () => {
  it("passes a tuple that exists", () => {
    const verdict = validateCombo(
      { drugName: "lisinopril", strength: "10 mg", dosageForm: "TABLET", route: "ORAL" },
      source,
    )
    expect(verdict.outcome).toBe(VerdictOutcome.Passed)
  })

  it("reports an inconsistent combo and offers what does exist", () => {
    const verdict = validateCombo(
      { drugName: "lisinopril", strength: "80 mg", dosageForm: "TABLET", route: "ORAL" },
      source,
    )
    expect(verdict.outcome).toBe(VerdictOutcome.InconsistentCombo)
    expect(verdict.detail).toContain("10 mg")
    expect(verdict.evidence.alternativeCount).toBe(2)
  })

  it("reports a drug absent from the catalogue as not in catalog", () => {
    const verdict = validateCombo(
      { drugName: "zolpidrex", strength: "10 mg", dosageForm: "TABLET", route: "ORAL" },
      source,
    )
    expect(verdict.outcome).toBe(VerdictOutcome.NotInCatalog)
    expect(verdict.evidence.alternativeCount).toBe(0)
  })

  it("takes the catalogue as a parameter so it stays pure", () => {
    let calls = 0
    const counting: ComboSource = {
      comboExists: () => {
        calls += 1
        return true
      },
      combosFor: () => [],
    }
    validateCombo(
      { drugName: "lisinopril", strength: "10 mg", dosageForm: "TABLET", route: "ORAL" },
      counting,
    )
    expect(calls).toBe(1)
  })

  it("never claims a check digit", () => {
    const verdict = validateCombo(
      { drugName: "lisinopril", strength: "10 mg", dosageForm: "TABLET", route: "ORAL" },
      source,
    )
    expect(verdict.evidence.hasCheckDigit).toBe(false)
    expect(verdict.ruleCited).toContain("tuple must exist")
  })
})
