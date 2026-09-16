import { describe, expect, it } from "vitest"
import { catalogFromFile, findDrug } from "@/catalog"
import { FieldName, GateAction, policyFor, ReasonCode, VerdictOutcome } from "@/domain"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import { validateField } from "@/sessions"
import fixture from "../../eval/fixtures/catalog-fixture.json"
import { candidateFor } from "./factory"

const catalog = catalogFromFile(fixture)

describe("the forty second demo path", () => {
  it("resolves a salted catalogue name from the bare spoken name", () => {
    expect(findDrug(catalog, "Bisoprolol")?.drug.nonproprietaryName).toBe("bisoprolol fumarate")
    expect(findDrug(catalog, "Tramadol")?.drug.nonproprietaryName).toBe(
      "tramadol hydrochloride",
    )
    expect(findDrug(catalog, "hydralazine")?.drug.nonproprietaryName).toBe(
      "hydralazine hydrochloride",
    )
  })

  it("lasa hit is not pre-empted by a catalogue miss at perfect confidence", () => {
    const verdict = validateField({
      field: FieldName.DrugName,
      normalizedValue: "bisoprolol",
      catalog,
    })

    expect(
      verdict.outcome,
      "if the catalogue misses the salted name, branch 3 returns before branch 5 and the demo dies",
    ).toBe(VerdictOutcome.Passed)

    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "Bisoprolol",
      normalizedValue: "bisoprolol",
      confidence: 1.0,
      outcome: verdict.outcome,
      lasa: lasaRiskFor("Bisoprolol"),
    })

    const decision = decide(candidate, policyFor(FieldName.DrugName))

    expect(decision.reasonCode).not.toBe(ReasonCode.ValidatorCatalog)
    expect(decision.action).toBe(GateAction.AskDisambiguate)
    expect(decision.reasonCode).toBe(ReasonCode.LasaHit)
    expect(decision.agentUtterance.toLowerCase()).toContain("lisinopril")
  })

  it("every lasa checked pair member that exists in the catalogue reaches the lasa branch", () => {
    const names = [
      "bisoprolol",
      "lisinopril",
      "tramadol",
      "trazodone",
      "hydralazine",
      "hydroxyzine",
    ]

    for (const name of names) {
      const verdict = validateField({
        field: FieldName.DrugName,
        normalizedValue: name,
        catalog,
      })
      expect(verdict.outcome, `${name} missed the catalogue`).toBe(VerdictOutcome.Passed)

      const decision = decide(
        candidateFor({
          field: FieldName.DrugName,
          rawValue: name,
          normalizedValue: name,
          confidence: 1.0,
          outcome: verdict.outcome,
          lasa: lasaRiskFor(name),
        }),
        policyFor(FieldName.DrugName),
      )

      expect(decision.reasonCode, `${name} did not reach the lasa branch`).toBe(
        ReasonCode.LasaHit,
      )
    }
  })
})
