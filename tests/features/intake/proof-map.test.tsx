import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FieldName, policyFor } from "@/domain"
import { FIELD_LABEL, INTAKE_ORDER } from "@/features/intake/field-language"
import {
  PROOF_GROUP,
  PROOF_MAP_TITLE,
  ProofKind,
  ProofMap,
  proofKindOf,
} from "@/features/intake/intake-screen/proof-map"

function groupOf(kind: ProofKind): HTMLElement {
  const heading = screen.getByRole("heading", { level: 3, name: PROOF_GROUP[kind].title })
  const group = heading.closest("section")
  if (group === null) {
    throw new Error(`${kind} has no section`)
  }
  return group
}

describe("the proof map on the idle call page", () => {
  it("files every field under the proof the gate policy really applies", () => {
    expect(proofKindOf(policyFor(FieldName.DrugName))).toBe(ProofKind.Named)
    expect(proofKindOf(policyFor(FieldName.PrescriberNpi))).toBe(ProofKind.Arithmetic)
    expect(proofKindOf(policyFor(FieldName.PrescriberDea))).toBe(ProofKind.Arithmetic)
    expect(proofKindOf(policyFor(FieldName.PatientName))).toBe(ProofKind.Voice)
    expect(proofKindOf(policyFor(FieldName.DosageForm))).toBe(ProofKind.Catalogue)
  })

  it("lists each field exactly once, so a new field cannot be left off the map", () => {
    render(<ProofMap />)
    expect(screen.getByRole("heading", { level: 2, name: PROOF_MAP_TITLE })).toBeDefined()
    for (const field of INTAKE_ORDER) {
      const kind = proofKindOf(policyFor(field))
      const terms = within(groupOf(kind)).getAllByRole("term")
      expect(
        terms.some((term) => term.textContent?.startsWith(FIELD_LABEL[field])),
        `${field} under ${kind}`,
      ).toBe(true)
    }
    expect(screen.getAllByRole("term")).toHaveLength(INTAKE_ORDER.length)
  })

  it("puts only the pair-rule drug under the named question, never a checksum field", () => {
    render(<ProofMap />)
    const terms = within(groupOf(ProofKind.Named))
      .getAllByRole("term")
      .map((term) => term.textContent)
    expect(terms).toEqual([FIELD_LABEL[FieldName.DrugName]])
  })
})
