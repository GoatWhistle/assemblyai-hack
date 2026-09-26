import { describe, expect, it } from "vitest"
import { FIELD_NAMES, policyFor } from "@/domain"
import {
  FIELD_LABEL,
  FIELD_PROOF_NOTE,
  FIELD_SPOKEN,
  INTAKE_ORDER,
} from "@/features/intake/field-language"

describe("field language", () => {
  it("labels every field the domain declares, not merely every field the form lists", () => {
    for (const field of FIELD_NAMES) {
      expect(
        FIELD_LABEL[field]?.length ?? 0,
        `${field} exists in the domain with no label, so it would render as a blank row on the form`,
      ).toBeGreaterThan(0)
      expect(
        FIELD_PROOF_NOTE[field]?.length ?? 0,
        `${field} has no note saying what proves it, which is the decision the policy table forces on every new field`,
      ).toBeGreaterThan(0)
    }
  })

  it("names every field in plain words for the caller, without pharmacy jargon", () => {
    for (const field of FIELD_NAMES) {
      expect(FIELD_SPOKEN[field]?.length ?? 0, `${field} has no spoken name`).toBeGreaterThan(0)
      expect(FIELD_SPOKEN[field]).not.toMatch(/\bsig\b/i)
    }
  })

  it("puts every declared field in the intake order rather than silently dropping one", () => {
    expect(
      [...INTAKE_ORDER].sort(),
      "a field added to the domain and left out of the intake order is collected by nothing, and the previous version of this test compared the order against itself",
    ).toEqual([...FIELD_NAMES].sort())
  })

  it("carries a policy for every field the form intends to collect", () => {
    for (const field of INTAKE_ORDER) {
      expect(
        policyFor(field).criticality,
        `${field} appears on the form with no policy, so nothing decides how it is proved`,
      ).toBeDefined()
    }
  })
})
