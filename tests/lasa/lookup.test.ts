import { describe, expect, it } from "vitest"
import { LasaSource } from "@/domain"
import { ISMP_PAIRS, LASA_PAIRS, lasaCheckedTerms, lasaRiskFor } from "@/lasa"

describe("lasa lookup", () => {
  it("finds the demo pair from either side", () => {
    const heard = lasaRiskFor("Morphine")
    expect(heard.hit).toBe(true)
    expect(heard.confusableWith).toContain("hydromorphone")
    expect(heard.source).toBe(LasaSource.Ismp2023)
    expect(heard.sourceRow).toContain("ISMP")

    const spoken = lasaRiskFor("Hydromorphone")
    expect(spoken.hit).toBe(true)
    expect(spoken.confusableWith).toContain("morphine")
  })

  it("is case insensitive and handles tall man forms", () => {
    for (const form of ["hydromorphone", "HYDROMORPHONE", "HYDROmorphone", "HydroMorphone"]) {
      const risk = lasaRiskFor(form)
      expect(risk.hit, form).toBe(true)
      expect(risk.confusableWith).toContain("morphine")
    }
  })

  it("matches through a salt suffix", () => {
    const risk = lasaRiskFor("tramadol hydrochloride")
    expect(risk.hit).toBe(true)
    expect(risk.confusableWith).toContain("trazodone")
  })

  it("returns a clean risk for a drug in no pair", () => {
    const risk = lasaRiskFor("amoxicillin")
    expect(risk.hit).toBe(false)
    expect(risk.matchedTerm).toBeNull()
    expect(risk.source).toBe(LasaSource.None)
    expect(risk.confusableWith).toEqual([])
  })

  it("carries at least twenty curated pairs, and checks the whole published list", () => {
    expect(LASA_PAIRS.length).toBeGreaterThanOrEqual(20)
    const terms = lasaCheckedTerms()
    for (const pair of LASA_PAIRS) {
      expect(terms.has(pair.termA) && terms.has(pair.termB), pair.sourceRow).toBe(true)
    }
    const listed = new Set(ISMP_PAIRS.flatMap((pair) => [pair.termA, pair.termB]))
    expect(
      terms.size,
      "the rule checks every name of the full ISMP list and nothing else",
    ).toBe(listed.size)
  })

  it("names every published partner of a name, not only the first one found", () => {
    const partners = ISMP_PAIRS.filter(
      (pair) => pair.termA === "hydromorphone" || pair.termB === "hydromorphone",
    ).map((pair) => (pair.termA === "hydromorphone" ? pair.termB : pair.termA))
    expect(partners.length).toBeGreaterThan(1)
    expect([...lasaRiskFor("hydromorphone").confusableWith].sort()).toEqual(
      [...partners].sort(),
    )
  })

  it("includes the pairs the demo and the plan require", () => {
    const required: readonly [string, string][] = [
      ["hydromorphone", "morphine"],
      ["hydralazine", "hydroxyzine"],
      ["clonidine", "clozapine"],
      ["metformin", "metronidazole"],
      ["tramadol", "trazodone"],
      ["diazepam", "diltiazem"],
      ["cycloserine", "cyclosporine"],
      ["dexamethasone", "dexmedetomidine"],
      ["glipizide", "glyburide"],
      ["cefazolin", "cefotetan"],
    ]

    for (const [a, b] of required) {
      const risk = lasaRiskFor(a)
      expect(risk.hit, `${a} is not in the table`).toBe(true)
      expect(
        risk.confusableWith.map((t) => t.toLowerCase()),
        `${a} is not paired with ${b}`,
      ).toContain(b)
    }
  })

  it("every pair names a real source row", () => {
    for (const pair of LASA_PAIRS) {
      expect(pair.sourceRow.length, `${pair.termA} has no source row`).toBeGreaterThan(10)
      expect([LasaSource.Ismp2023, LasaSource.FdaNameDiff]).toContain(pair.source)
    }
  })

  it("has no duplicate or self referential pair", () => {
    const seen = new Set<string>()
    for (const pair of LASA_PAIRS) {
      expect(pair.termA).not.toBe(pair.termB)
      const key = [pair.termA, pair.termB].sort().join("|")
      expect(seen.has(key), `duplicate pair ${key}`).toBe(false)
      seen.add(key)
    }
  })
})
