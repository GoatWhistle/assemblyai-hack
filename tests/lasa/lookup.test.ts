import { describe, expect, it } from "vitest"
import { LasaSource } from "@/domain"
import { LASA_PAIRS, lasaCheckedTerms, lasaPairCount, lasaRiskFor } from "@/lasa"

describe("lasa lookup", () => {
  it("finds the demo pair from either side", () => {
    const heard = lasaRiskFor("Bisoprolol")
    expect(heard.hit).toBe(true)
    expect(heard.confusableWith).toContain("lisinopril")
    expect(heard.source).toBe(LasaSource.Ismp2023)
    expect(heard.sourceRow).toContain("ISMP")

    const spoken = lasaRiskFor("Lisinopril")
    expect(spoken.hit).toBe(true)
    expect(spoken.confusableWith).toContain("bisoprolol")
  })

  it("is case insensitive and handles tall man forms", () => {
    for (const form of ["vinblastine", "VINBLASTINE", "vinBLAStine", "VinBlastine"]) {
      const risk = lasaRiskFor(form)
      expect(risk.hit, form).toBe(true)
      expect(risk.confusableWith).toContain("vincristine")
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

  it("carries at least twenty curated pairs", () => {
    expect(lasaPairCount()).toBeGreaterThanOrEqual(20)
    expect(lasaCheckedTerms().size).toBe(LASA_PAIRS.length * 2)
  })

  it("includes the pairs the demo and the plan require", () => {
    const required: readonly [string, string][] = [
      ["lisinopril", "bisoprolol"],
      ["hydralazine", "hydroxyzine"],
      ["clonidine", "klonopin"],
      ["metformin", "metronidazole"],
      ["tramadol", "trazodone"],
      ["vinblastine", "vincristine"],
      ["cycloserine", "cyclosporine"],
      ["chlorpromazine", "chlorpropamide"],
      ["glipizide", "glyburide"],
      ["sulfadiazine", "sulfasalazine"],
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
