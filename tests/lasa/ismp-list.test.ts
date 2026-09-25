import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { ISMP_PAIR_RECORDS, lasaRiskFor } from "@/lasa"
import { baseName, pairsFromRows } from "../../scripts/build/lasa-pairs"
import { parseIsmp } from "../../scripts/build/lasa-parse"

const RAW = [
  "www.ismp.org | 3",
  "Drug Name Confused Drug Name",
  "HYDROmorphone morphine",
  "Allegra (fexofenadine)",
  "Allegra Anti-Itch Cream",
  "(diphenhydrAMINE/allantoin)",
  "Allegra Anti-Itch Cream",
  "(diphenhydrAMINE/allantoin)",
  "Allegra (fexofenadine)",
  "morphine HYDROmorphone",
  "Note: Brand names start with uppercase letter.",
  "brand names. Brand names appear in black",
].join("\n")

const LAYOUT = [
  "      HYDROmorphone        morphine",
  "   Allegra (fexofenadine)      Allegra Anti-Itch Cream",
  "                               (diphenhydrAMINE/allantoin)",
  "       morphine        HYDROmorphone",
].join("\n")

describe("the ISMP list parser", () => {
  const parse = parseIsmp(RAW, LAYOUT)

  it("keeps the page and the row of every entry it reads", () => {
    expect(parse.rows.map((row) => [row.page, row.row, row.drug, row.confused])).toEqual([
      [3, 1, "HYDROmorphone", "morphine"],
      [3, 2, "Allegra (fexofenadine)", "Allegra Anti-Itch Cream (diphenhydrAMINE/allantoin)"],
      [3, 3, "Allegra Anti-Itch Cream (diphenhydrAMINE/allantoin)", "Allegra (fexofenadine)"],
      [3, 4, "morphine", "HYDROmorphone"],
    ])
    expect(parse.unresolved).toEqual([])
  })

  it("reads tall man letters and parentheticals down to the name a caller says", () => {
    expect(baseName("HYDROmorphone")).toBe("hydromorphone")
    expect(baseName("cycloSERINE*")).toBe("cycloserine")
    expect(baseName("Zantac (raNITIdine) [no longer marketed in US]*")).toBe("zantac")
  })

  it("counts a pair once although the list prints it in both directions, and drops a name paired with itself", () => {
    const pairs = pairsFromRows(parse.rows)
    expect(pairs.map((pair) => [pair.termA, pair.termB])).toEqual([
      ["hydromorphone", "morphine"],
      ["allegra", "allegra anti itch cream"],
    ])
    expect([pairs[0]?.listedA, pairs[0]?.listedB]).toEqual(["HYDROmorphone", "morphine"])
  })
})

describe("the committed full list", () => {
  it("gives every pair a page and a row of the source", () => {
    for (const pair of ISMP_PAIR_RECORDS) {
      expect(pair.page, pair.listedA).toBeGreaterThan(0)
      expect(pair.row, pair.listedA).toBeGreaterThan(0)
      expect([baseName(pair.listedA), baseName(pair.listedB)].sort(), pair.listedA).toEqual(
        [pair.termA, pair.termB].sort(),
      )
    }
  })

  it("is the source of the product rule: a pair outside the curated twenty still triggers it", () => {
    const outside = ISMP_PAIR_RECORDS.find((pair) => pair.termA === "celebrex")
    expect(outside).toBeDefined()
    expect(lasaRiskFor("celebrex").confusableWith).toContain(outside?.termB)
  })

  it("names the PDF it was parsed from by URL and digest", () => {
    const file = JSON.parse(readFileSync("data/lasa-pairs.json", "utf8")) as {
      sourceUrl: string
      sourcePdfSha256: string
      rowsUnresolved: readonly unknown[]
    }
    expect(file.sourceUrl).toContain("ISMP_ConfusedDrugNames_2023.pdf")
    expect(file.sourcePdfSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(file.rowsUnresolved).toEqual([])
  })
})
