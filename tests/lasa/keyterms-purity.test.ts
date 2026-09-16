import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { catalogFromFile, findDrug } from "@/catalog"
import { buildKeyterms, KEYTERMS_MAX, lasaCheckedTerms, normalizeTerm } from "@/lasa"
import fixture from "../../eval/fixtures/catalog-fixture.json"

const catalog = catalogFromFile(fixture)

describe("keyterms purity", () => {
  it("no lasa term leaks into keyterms", () => {
    const forbidden = lasaCheckedTerms()
    const leaked = buildKeyterms()
      .filter((term) => forbidden.has(normalizeTerm(term)))
      .sort()

    expect(
      leaked,
      "biasing the recognizer toward the exact words the LASA rules look for makes the gate confirm what we suggested, not what was said",
    ).toEqual([])
  })

  it("the intersection of keyterms and all lasa terms is empty", () => {
    const keyterms = new Set(buildKeyterms().map(normalizeTerm))
    const intersection = [...lasaCheckedTerms()].filter((term) => keyterms.has(term))
    expect(intersection).toEqual([])
  })

  it("no lasa term hides inside a multiword keyterm", () => {
    const forbidden = lasaCheckedTerms()
    const offenders: string[] = []

    for (const term of buildKeyterms()) {
      const tokens = normalizeTerm(term).split(" ")
      for (const size of [1, 2]) {
        for (let i = 0; i + size <= tokens.length; i += 1) {
          if (forbidden.has(tokens.slice(i, i + size).join(" "))) {
            offenders.push(term)
          }
        }
      }
    }

    expect([...new Set(offenders)].sort()).toEqual([])
  })

  it("no keyterm appears in the catalogue as a drug name", () => {
    const offenders = buildKeyterms().filter((term) => {
      const match = findDrug(catalog, term)
      return match !== null && match.matchKind === "exact"
    })
    expect(
      offenders.sort(),
      "a keyterm that is also a catalogue drug name biases the recognizer on a verified field",
    ).toEqual([])
  })

  it("no keyterm is a drug name in the full built catalogue when one is present", () => {
    let full: ReturnType<typeof catalogFromFile>
    try {
      full = catalogFromFile(
        JSON.parse(readFileSync(resolve("data/catalog.json"), "utf8")) as typeof fixture,
      )
    } catch {
      return
    }
    const offenders = buildKeyterms().filter((term) => {
      const match = findDrug(full, term)
      return match !== null && match.matchKind === "exact"
    })
    expect(offenders.sort()).toEqual([])
  })

  it("keyterms fit the documented limit", () => {
    const keyterms = buildKeyterms()
    expect(
      keyterms.length,
      `${keyterms.length} terms; keyterms_prompt max is ${KEYTERMS_MAX}. Terms beyond the limit are silently ignored - the recognizer will not error.`,
    ).toBeLessThanOrEqual(KEYTERMS_MAX)
  })

  it("keyterms are unique case insensitively", () => {
    const lowered = buildKeyterms().map((t) => t.toLowerCase())
    expect(new Set(lowered).size).toBe(lowered.length)
  })

  it("the lasa list is actually loaded", () => {
    expect(
      lasaCheckedTerms().size,
      "an empty lasa table would make the leak test vacuously green",
    ).toBeGreaterThanOrEqual(40)
  })

  it("the keyterms list is actually populated", () => {
    expect(buildKeyterms().length).toBeGreaterThanOrEqual(80)
  })

  it("spends the fixed skeleton of 92 terms", () => {
    expect(buildKeyterms().length).toBe(92)
  })
})
