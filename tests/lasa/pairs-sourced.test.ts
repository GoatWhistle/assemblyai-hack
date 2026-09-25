import { describe, expect, it } from "vitest"
import { findDrug, loadCatalogFrom } from "@/catalog"
import { ISMP_2023_ROW_PREFIX, ISMP_PAIR_RECORDS, LASA_PAIRS } from "@/lasa"

const catalog = loadCatalogFrom("data/catalog.json")

function rowNames(row: string): readonly string[] {
  return row.slice(ISMP_2023_ROW_PREFIX.length).split(" - ")
}

describe("every curated LASA pair quotes a row that exists and names two catalogue drugs", () => {
  it("holds exactly 20 pairs", () => {
    expect(LASA_PAIRS.length).toBe(20)
  })

  it("never cites lisinopril or bisoprolol, which the 2023 ISMP list does not contain", () => {
    const cited = LASA_PAIRS.flatMap((pair) => [pair.termA, pair.termB, pair.sourceRow])
      .join(" ")
      .toLowerCase()
    expect(cited).not.toContain("lisinopril")
    expect(cited).not.toContain("bisoprolol")
    expect(cited).not.toContain("azithromycin")
    expect(cited).not.toContain("rifabutin")
    expect(cited).not.toContain("buprenorphine")
    expect(cited).not.toContain("levetiracetam")
    expect(cited).not.toContain("cefotaxime")
  })

  it("pairs two distinct names, each present in the built catalogue", () => {
    for (const pair of LASA_PAIRS) {
      expect(pair.termA, pair.sourceRow).not.toBe(pair.termB)
      for (const term of [pair.termA, pair.termB]) {
        expect(findDrug(catalog, term), `${term} is not in data/catalog.json`).not.toBeNull()
      }
    }
  })

  it("quotes the two names of its own pair, in the list's tall-man spelling", () => {
    for (const pair of LASA_PAIRS) {
      expect(pair.sourceRow.startsWith(ISMP_2023_ROW_PREFIX), pair.sourceRow).toBe(true)
      const names = rowNames(pair.sourceRow).map((name) => name.toLowerCase())
      expect([...names].sort(), pair.sourceRow).toEqual([pair.termA, pair.termB].sort())
    }
  })

  it("is a row of the full ISMP list parsed from the PDF, with its page and row", () => {
    for (const pair of LASA_PAIRS) {
      const key = [pair.termA, pair.termB].sort().join("|")
      const row = ISMP_PAIR_RECORDS.find(
        (entry) => [entry.termA, entry.termB].sort().join("|") === key,
      )
      expect(row, `${pair.sourceRow} is not a row of the committed ISMP list`).toBeDefined()
      expect(row?.page).toBeGreaterThan(0)
      expect(row?.row).toBeGreaterThan(0)
    }
  })
})
