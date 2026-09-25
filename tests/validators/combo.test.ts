import { describe, expect, it } from "vitest"
import { VerdictOutcome } from "@/domain"
import { type ComboQuery, type ComboSource, spokenStrength, validateCombo } from "@/validators"

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

  it("names a partner that comes in the dose the heard drug lacks", () => {
    const verdict = validateCombo(
      { drugName: "lisinopril", strength: "80 mg", dosageForm: "TABLET", route: "ORAL" },
      { ...source, partnersOf: () => ["lisinoprol", "fosinopril"] },
    )
    expect(verdict.outcome).toBe(VerdictOutcome.InconsistentCombo)
    expect(verdict.evidence.partnersWithCombo).toBeUndefined()
    const named = validateCombo(
      { drugName: "fosinopril", strength: "10 mg", dosageForm: "TABLET", route: "ORAL" },
      {
        ...source,
        combosFor: () => [{ strength: "20 mg", dosageForm: "TABLET", route: "ORAL" }],
        partnersOf: () => ["lisinopril"],
      },
    )
    expect(named.detail).toBe(
      "fosinopril does not come as a 10 milligram tablet; lisinopril does",
    )
  })

  it("speaks a strength in words a caller hears", () => {
    expect(spokenStrength("2 mg")).toBe("2 milligram")
    expect(spokenStrength("2 mg/1")).toBe("2 milligram")
    expect(spokenStrength("2 mg/mL")).toBe("2 milligram per milliliter")
    expect(spokenStrength("100 mcg")).toBe("100 microgram")
  })
})
