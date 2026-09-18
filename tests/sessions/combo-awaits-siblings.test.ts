import { describe, expect, it } from "vitest"
import { catalogFromFile } from "@/catalog"
import { FieldName, VerdictOutcome } from "@/domain"
import { validateField } from "@/sessions"
import fixture from "../../eval/fixtures/catalog-fixture.json"

const catalog = catalogFromFile(fixture)

const DRUG = "phenylephrine hydrochloride"
const STRENGTH = "100 mg/10ml"
const FORM = "INJECTION"
const ROUTE = "INTRAVENOUS"

const COMBO_FIELDS: readonly FieldName[] = [
  FieldName.Strength,
  FieldName.DosageForm,
  FieldName.Route,
]

function check(field: FieldName, value: string, context: Record<string, string>) {
  return validateField({ field, normalizedValue: value, catalog, context })
}

describe("a combination is checked as a whole, so a missing sibling is not a failure of the value", () => {
  it("reports every combo field as not applicable when it is the first of the three to arrive", () => {
    const values: Readonly<Record<string, string>> = {
      [FieldName.Strength]: STRENGTH,
      [FieldName.DosageForm]: FORM,
      [FieldName.Route]: ROUTE,
    }
    for (const field of COMBO_FIELDS) {
      const verdict = check(field, String(values[field]), { drugName: DRUG })
      expect(
        verdict.outcome,
        `${field} arriving before its siblings was judged ${verdict.outcome}. Checking a combination against a blank sibling reports the catalogue as inconsistent when nothing is wrong with the value, which spends a re-ask on a value the speaker got right and makes an honest intake unable to reach commitOrder at all`,
      ).toBe(VerdictOutcome.NotApplicable)
    }
  })

  it("names which sibling it is waiting for, so the verdict is not an unexplained abstention", () => {
    const verdict = check(FieldName.Strength, STRENGTH, { drugName: DRUG, route: ROUTE })
    expect(
      String(verdict.evidence.awaiting),
      "a not-applicable verdict that does not say what is missing cannot be distinguished from a validator that silently declined to run",
    ).toContain("dosage form")
    expect(
      verdict.detail,
      "the detail must state the reason in words, because it is what the agent says and what a reader of the session record sees",
    ).toMatch(/checked as a whole/)
  })

  it("still checks the combination once all four parts are known, so the abstention is not permanent", () => {
    const verdict = check(FieldName.Strength, STRENGTH, {
      drugName: DRUG,
      dosageForm: FORM,
      route: ROUTE,
    })
    expect(
      verdict.outcome,
      "a real combination present in the catalogue must pass; if it did not, this abstention would have replaced a working check rather than deferring it",
    ).toBe(VerdictOutcome.Passed)
  })

  it("still refuses a combination that does not exist, which is the case the check exists for", () => {
    const verdict = check(FieldName.Strength, "999 mg/1", {
      drugName: DRUG,
      dosageForm: FORM,
      route: ROUTE,
    })
    expect(
      verdict.outcome,
      "deferring the check while a sibling is missing must not become a way for any combination to pass; a strength the catalogue does not list under this drug has to be refused",
    ).toBe(VerdictOutcome.InconsistentCombo)
  })

  it("keeps abstaining when the drug name itself is unknown, which was the original rule", () => {
    const verdict = check(FieldName.Route, ROUTE, { dosageForm: FORM, strength: STRENGTH })
    expect(
      verdict.outcome,
      "the pre-existing rule that nothing can be checked before the drug name is known must survive this change",
    ).toBe(VerdictOutcome.NotApplicable)
  })
})
