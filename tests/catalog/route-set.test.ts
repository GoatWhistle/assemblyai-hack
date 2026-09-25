import { describe, expect, it } from "vitest"
import { catalogFromFile, comboExists, loadCatalogFrom } from "@/catalog"

const catalog = loadCatalogFrom("data/catalog.json")

const synthetic = catalogFromFile({
  builtAt: "2026-09-25T00:00:00.000Z",
  sourceUrl: "test",
  rowsRead: 1,
  rowsAfterPrescriptionFilter: 1,
  rowsAfterDedup: 1,
  drugs: [
    {
      nonproprietaryName: "hydromorphone hydrochloride",
      proprietaryNames: [],
      deaSchedule: "CII",
      combos: [
        {
          strength: "2 mg/mL",
          dosageForm: "INJECTION",
          route: "INTRAMUSCULAR; INTRAVENOUS; SUBCUTANEOUS",
        },
      ],
    },
  ],
})

function hydromorphone(route: string, index = catalog): boolean {
  return comboExists(index, {
    drugName: "hydromorphone",
    strength: "2 mg/mL",
    dosageForm: "INJECTION",
    route,
  })
}

describe("a catalogue route list is a set of routes, not one string", () => {
  it("passes hydromorphone 2 mg/mL injection ordered IV, the right drug of the S0 demo", () => {
    expect(
      hydromorphone("INTRAVENOUS"),
      "the catalogue lists this product as INTRAMUSCULAR; INTRAVENOUS; SUBCUTANEOUS, and refusing an IV order for it would refuse the caller's correction as E_VALIDATOR_COMBO",
    ).toBe(true)
  })

  it("still passes morphine 2 mg/mL injection IV, which matched exactly before", () => {
    expect(
      comboExists(catalog, {
        drugName: "morphine",
        strength: "2 mg/mL",
        dosageForm: "INJECTION",
        route: "INTRAVENOUS",
      }),
    ).toBe(true)
  })

  it("accepts every member of the list and the whole list itself", () => {
    for (const route of [
      "INTRAMUSCULAR",
      "INTRAVENOUS",
      "SUBCUTANEOUS",
      "intravenous",
      " Intravenous ",
      "INTRAMUSCULAR; INTRAVENOUS; SUBCUTANEOUS",
      "SUBCUTANEOUS; INTRAVENOUS",
    ]) {
      expect(hydromorphone(route, synthetic), route).toBe(true)
    }
  })

  it("refuses a route that is not a member, even when it shares letters with one", () => {
    for (const route of [
      "ORAL",
      "INTRATHECAL",
      "INTRA",
      "VENOUS",
      "INTRAVENOUS; ORAL",
      "",
      ";",
    ]) {
      expect(hydromorphone(route, synthetic), route).toBe(false)
    }
    expect(hydromorphone("ORAL"), "no hydromorphone 2 mg/mL injection is given by mouth").toBe(
      false,
    )
  })

  it("keeps strength and form exact while the route is a set", () => {
    expect(
      comboExists(synthetic, {
        drugName: "hydromorphone",
        strength: "4 mg/mL",
        dosageForm: "INJECTION",
        route: "INTRAVENOUS",
      }),
    ).toBe(false)
    expect(
      comboExists(synthetic, {
        drugName: "hydromorphone",
        strength: "2 mg/mL",
        dosageForm: "TABLET",
        route: "INTRAVENOUS",
      }),
    ).toBe(false)
  })
})
