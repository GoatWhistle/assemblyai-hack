import { describe, expect, it } from "vitest"
import { loadCatalog } from "@/catalog"
import { collisions } from "../../scripts/measure/audit-catalog"

const rows = collisions()
const kind = (name: string) => rows.filter((row) => row.kind === name)

describe("our own detector, pointed at our own catalogue", () => {
  it("finds skeleton collisions at all, or the finding has evaporated", () => {
    expect(
      rows.length,
      "the report cites a self-audit of the shipped catalogue; zero collisions would mean either the catalogue or the skeleton changed and the report must stop citing it",
    ).toBeGreaterThan(0)
  })

  it("separates one name punctuated twice from a real collision", () => {
    for (const row of kind("punctuation_only")) {
      const bare = new Set(row.names.map((name) => name.toLowerCase().replace(/[^a-z]/g, "")))
      expect(
        bare.size,
        `${row.skeleton} was classified as punctuation-only but its names differ in letters`,
      ).toBe(1)
    }
  })

  it("classifies a single transposition as a registry error rather than a second drug", () => {
    const misspellings = kind("registry_misspelling")
    expect(
      misspellings.length,
      "the FDA registry contains plain spelling errors and the audit is worth little if it cannot tell them from distinct products",
    ).toBeGreaterThan(0)
    for (const row of misspellings) {
      expect(row.names.length).toBeGreaterThan(1)
    }
  })

  it("finds pairs of genuinely different drugs sharing a skeleton", () => {
    const distinct = kind("distinct_drugs")
    expect(
      distinct.length,
      "this is the group that matters: two real products a vowel substitution would confuse, which is the condition the gate refuses on rather than guessing",
    ).toBeGreaterThan(0)
    for (const row of distinct) {
      const bare = row.names.map((name) => name.toLowerCase().replace(/[^a-z]/g, ""))
      expect(new Set(bare).size, row.skeleton).toBeGreaterThan(1)
    }
  })

  it("assigns every collision exactly one classification", () => {
    const counted =
      kind("punctuation_only").length +
      kind("registry_misspelling").length +
      kind("distinct_drugs").length
    expect(counted).toBe(rows.length)
  })

  it("never reports a skeleton shorter than the minimum the gate uses", () => {
    for (const row of rows) {
      expect(
        row.skeleton.length,
        "a three-letter skeleton collides too often to carry information, and the gate declines to name neighbours below that length",
      ).toBeGreaterThanOrEqual(4)
    }
  })

  it("reproduces the exact figures eval/REPORT.md publishes for the catalogue self-audit", () => {
    expect(
      rows.length,
      "the LASA-coverage section cites 131 total collisions; a rebuilt catalogue that moves this number silently invalidates the published split",
    ).toBe(131)
    expect(kind("punctuation_only").length).toBe(71)
    expect(kind("registry_misspelling").length).toBe(28)
    expect(
      kind("distinct_drugs").length,
      "this is the row the report calls 'the exposed surface'; a mutation test guards it separately",
    ).toBe(32)
  })

  it("indexes the exact number of distinct skeletons make audit-catalog now prints", () => {
    const index = loadCatalog()
    expect(
      index.bySkeleton.size,
      "eval/REPORT.md cites 5707 distinct skeletons over 3730 drugs; this was previously unreproducible by any single command",
    ).toBe(5707)
  })
})
