import { describe, expect, it } from "vitest"
import { FIELD_NAMES, type FieldName, policyFor } from "@/domain"
import { FIELD_PROOF_NOTE, INTAKE_ORDER } from "@/features/intake/field-language"
import {
  fieldsWhoseNoteDrifted,
  noteMatchesPolicy,
  PROOF_KIND_MARKER,
  proofKindOf,
  VALIDATOR_PROOF_KIND,
  voiceOnlyFields,
} from "@/features/intake/proof-binding"

describe("the form's prose is bound to the policy table, not written beside it", () => {
  it("agrees with the policy table about what proves every field", () => {
    expect(
      fieldsWhoseNoteDrifted(FIELD_NAMES),
      "FIELD_PROOF_NOTE is a second formulation of the policy table's validator column. Two formulations of one rule drift, and the drifting one is the prose a reader trusts. This binds them so a validator change breaks the note in the same run.",
    ).toEqual([])
  })

  it("covers every field the form collects, with no silent gap", () => {
    for (const field of INTAKE_ORDER) {
      expect(
        proofKindOf(field),
        `${field} appears on the form but its validator maps to no proof kind, so nothing decides how the form describes it`,
      ).toBeDefined()
    }
  })

  it("maps every validator the domain declares, so a new one cannot slip through untyped", () => {
    const declared = new Set(FIELD_NAMES.map((field) => policyFor(field).validator))
    for (const validator of declared) {
      expect(
        VALIDATOR_PROOF_KIND[validator],
        `${validator} is used by the policy table and has no proof kind, so any prose about it is unchecked`,
      ).toBeDefined()
    }
  })

  it("gives each proof kind at least one marker, so no kind passes by having nothing to match", () => {
    for (const [kind, markers] of Object.entries(PROOF_KIND_MARKER)) {
      expect(
        markers.length,
        `${kind} has no marker phrase, so every note would satisfy it and the binding would check nothing`,
      ).toBeGreaterThan(0)
    }
  })
})

describe("the field with no validator is named as such by both sides", () => {
  it("finds exactly the fields whose validator is none or spoken support", () => {
    const found = voiceOnlyFields(FIELD_NAMES)
    for (const field of found) {
      expect(
        policyFor(field).readBackAlways,
        `${field} has no independent validator, so a read-back is the only proof and cannot be optional`,
      ).toBe(true)
    }
  })

  it("says in its prose that voice is the only proof available", () => {
    for (const field of voiceOnlyFields(FIELD_NAMES)) {
      expect(
        FIELD_PROOF_NOTE[field]?.toLowerCase(),
        `${field} is proved by nothing but voice, and its note has to say so rather than implying a check exists`,
      ).toMatch(/only proof|voice confirmation/)
    }
  })
})

describe("the binding fails when the prose stops matching", () => {
  it("rejects a note that claims arithmetic for a catalogue-proved field", () => {
    const drifted: Record<string, string> = { ...FIELD_PROOF_NOTE }
    expect(
      noteMatchesPolicy("drug_name" as FieldName),
      "the shipped note for a catalogue-proved field must satisfy the binding before the negative case means anything",
    ).toBe(true)
    drifted.drug_name = "Proved arithmetically by a check digit."
    const kind = proofKindOf("drug_name" as FieldName)
    const satisfied = PROOF_KIND_MARKER[kind].some((marker) =>
      String(drifted.drug_name).toLowerCase().includes(marker),
    )
    expect(
      satisfied,
      "a drug name has no check digit, and prose claiming one is the easiest lie in this domain to catch; the binding must reject it",
    ).toBe(false)
  })

  it("rejects an empty note, so absence does not read as agreement", () => {
    const kind = proofKindOf("prescriber_npi" as FieldName)
    const satisfied = PROOF_KIND_MARKER[kind].some((marker) => "".includes(marker))
    expect(
      satisfied,
      "an absent note must fail the binding; a check that passes on a missing subject manufactures confidence",
    ).toBe(false)
  })
})
