import { describe, expect, it } from "vitest"
import {
  allDrugNames,
  catalogFromFile,
  comboExists,
  comboSourceFor,
  combosFor,
  deaScheduleFor,
  drugCount,
  findDrug,
  loadCatalogFrom,
  searchDrugs,
} from "@/catalog"
import { CatalogUnavailableError } from "@/domain"
import fixture from "../../eval/fixtures/catalog-fixture.json"

const catalog = catalogFromFile(fixture)

describe("catalogue access", () => {
  it("loads the fixture rather than the hundred thousand row file", () => {
    expect(drugCount(catalog)).toBeLessThan(100)
    expect(drugCount(catalog)).toBeGreaterThan(5)
  })

  it("finds a drug by its exact nonproprietary name", () => {
    const match = findDrug(catalog, "lisinopril")
    expect(match?.matchKind).toBe("exact")
    expect(match?.drug.nonproprietaryName).toBe("lisinopril")
  })

  it("finds a drug through its salt suffix", () => {
    expect(findDrug(catalog, "tramadol")?.drug.nonproprietaryName).toBe(
      "tramadol hydrochloride",
    )
    expect(findDrug(catalog, "bisoprolol")?.drug.nonproprietaryName).toBe("bisoprolol fumarate")
  })

  it("finds a drug by brand name", () => {
    expect(findDrug(catalog, "Zebeta")?.drug.nonproprietaryName).toBe("bisoprolol fumarate")
  })

  it("returns null for a name in no row", () => {
    expect(findDrug(catalog, "zolpidrex")).toBeNull()
    expect(findDrug(catalog, "")).toBeNull()
  })

  it("lists the combos a drug actually has", () => {
    const combos = combosFor(catalog, "lisinopril")
    expect(combos.length).toBeGreaterThan(0)
    for (const combo of combos) {
      expect(combo.dosageForm.length).toBeGreaterThan(0)
      expect(combo.route.length).toBeGreaterThan(0)
    }
  })

  it("confirms a combo that exists and denies one that does not", () => {
    const first = combosFor(catalog, "lisinopril")[0]
    expect(first).toBeDefined()
    expect(
      comboExists(catalog, {
        drugName: "lisinopril",
        strength: String(first?.strength),
        dosageForm: String(first?.dosageForm),
        route: String(first?.route),
      }),
    ).toBe(true)

    expect(
      comboExists(catalog, {
        drugName: "lisinopril",
        strength: "999 mg",
        dosageForm: "TABLET",
        route: "ORAL",
      }),
    ).toBe(false)
  })

  it("matches a spoken strength against the catalogue per unit form", () => {
    expect(
      comboExists(catalog, {
        drugName: "prednisone",
        strength: "10 mg",
        dosageForm: "TABLET",
        route: "ORAL",
      }),
      "a spoken 10 mg must match the catalogue 10 mg/1 or every strength re-asks forever",
    ).toBe(true)

    expect(
      comboExists(catalog, {
        drugName: "prednisone",
        strength: "999 mg",
        dosageForm: "TABLET",
        route: "ORAL",
      }),
    ).toBe(false)
  })

  it("searches by substring up to a limit", () => {
    const matches = searchDrugs(catalog, "pril", 3)
    expect(matches.length).toBeLessThanOrEqual(3)
    expect(searchDrugs(catalog, "", 3)).toEqual([])
  })

  it("exposes the dea schedule when the catalogue carries one", () => {
    expect(deaScheduleFor(catalog, "zolpidrex")).toBeNull()
    const names = allDrugNames(catalog)
    expect(names.length).toBe(drugCount(catalog))
  })

  it("adapts to the pure combo source the validator expects", () => {
    const source = comboSourceFor(catalog)
    expect(source.combosFor("lisinopril").length).toBeGreaterThan(0)
    expect(
      source.comboExists({
        drugName: "lisinopril",
        strength: "999 mg",
        dosageForm: "TABLET",
        route: "ORAL",
      }),
    ).toBe(false)
  })

  it("treats mcg and ug as the same unit, because speech normalises to one and the file uses the other", () => {
    const source = comboSourceFor(catalog)
    const asFile = source.comboExists({
      drugName: "phenylephrine hydrochloride",
      strength: "100 ug/mL",
      dosageForm: "INJECTION",
      route: "INTRAVENOUS",
    })
    const asSpoken = source.comboExists({
      drugName: "phenylephrine hydrochloride",
      strength: "100 mcg/mL",
      dosageForm: "INJECTION",
      route: "INTRAVENOUS",
    })
    expect(asFile, "the catalogue writes this strength as ug").toBe(true)
    expect(
      asSpoken,
      "a caller saying one hundred micrograms normalises to mcg; rejecting that is a false refusal on a real prescription",
    ).toBe(true)
  })

  it("fails with a clear error when the data file is absent", () => {
    expect(() => loadCatalogFrom("data/does-not-exist.json")).toThrow(CatalogUnavailableError)
    expect(() => loadCatalogFrom("data/does-not-exist.json")).toThrow(/make data/)
  })

  it("fails with a clear error when the data file is not a catalogue", () => {
    expect(() => loadCatalogFrom("package.json")).toThrow(CatalogUnavailableError)
  })
})
