import { type FieldName, policyFor } from "@/domain"
import type { ValidatorName } from "@/domain/verdict"
import { FIELD_PROOF_NOTE } from "./field-language"

export type ProofKind = "arithmetic" | "catalogue" | "range" | "list" | "voice_only"

export const VALIDATOR_PROOF_KIND: Readonly<Record<ValidatorName, ProofKind>> = Object.freeze({
  npi_luhn: "arithmetic",
  dea_mod10: "arithmetic",
  ndc_format: "catalogue",
  ndc_catalog: "catalogue",
  combo_consistency: "catalogue",
  sig_abbrev: "list",
  spoken_support: "voice_only",
  range_check: "range",
  schedule_refills: "list",
  none: "voice_only",
})

export const PROOF_KIND_MARKER: Readonly<Record<ProofKind, readonly string[]>> = Object.freeze({
  arithmetic: ["arithmetic"],
  catalogue: ["catalogue", "combination", "tuple existing together"],
  range: ["range"],
  list: ["list"],
  voice_only: ["voice confirmation", "only proof"],
})

export function proofKindOf(field: FieldName): ProofKind {
  return VALIDATOR_PROOF_KIND[policyFor(field).validator]
}

export function noteMatchesPolicy(field: FieldName): boolean {
  const note = (FIELD_PROOF_NOTE[field] ?? "").toLowerCase()
  return PROOF_KIND_MARKER[proofKindOf(field)].some((marker) => note.includes(marker))
}

export function fieldsWhoseNoteDrifted(fields: readonly FieldName[]): readonly string[] {
  return fields
    .filter((field) => !noteMatchesPolicy(field))
    .map(
      (field) =>
        `${field} is validated by ${policyFor(field).validator} but its note says otherwise`,
    )
}

export function voiceOnlyFields(fields: readonly FieldName[]): readonly FieldName[] {
  return fields.filter((field) => proofKindOf(field) === "voice_only")
}
