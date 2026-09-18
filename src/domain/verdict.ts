import { VerdictOutcome } from "./enums"

export type EvidenceValue = string | number | boolean | null

export type Evidence = Readonly<Record<string, EvidenceValue>>

export type ValidatorName =
  | "npi_luhn"
  | "dea_mod10"
  | "ndc_format"
  | "ndc_catalog"
  | "combo_consistency"
  | "sig_abbrev"
  | "spoken_support"
  | "range_check"
  | "schedule_refills"
  | "none"

export type ValidatorVerdict = {
  readonly outcome: VerdictOutcome
  readonly validatorName: ValidatorName
  readonly ruleCited: string
  readonly detail: string
  readonly checkedValue: string
  readonly evidence: Evidence
}

export const RULE_CITATIONS: Readonly<Record<ValidatorName, string>> = Object.freeze({
  npi_luhn: 'Luhn mod-10 over "80840" + first 9 digits (ISO/IEC 7812 issuer ID 80840)',
  dea_mod10: "(d1+d3+d5) + 2*(d2+d4+d6); last digit of result == d7",
  ndc_format: "FDA NDC format: 10-digit 4-4-2/5-3-2/5-4-1 or 11-digit strictly 5-4-2",
  ndc_catalog: "product.txt lookup: proprietary_name or nonproprietary_name exact match",
  combo_consistency: "product.txt: (drug x strength x dosage_form x route) tuple must exist",
  sig_abbrev: "ISMP Error-Prone Abbreviations 2024-04: abbreviation is on the do-not-use list",
  spoken_support:
    "every token of a proposed value must be accounted for by the recognized words of the turn its provenance points at",
  range_check: "field range policy: integer within the documented bounds",
  schedule_refills:
    "21 CFR 1306.12(a): the refilling of a prescription for a controlled substance listed in Schedule II is prohibited",
  none: "no independent validator exists for this field",
})

export function makeVerdict(input: {
  outcome: VerdictOutcome
  validatorName: ValidatorName
  detail: string
  checkedValue: string
  evidence?: Evidence
  ruleCited?: string
}): ValidatorVerdict {
  return Object.freeze({
    outcome: input.outcome,
    validatorName: input.validatorName,
    ruleCited: input.ruleCited ?? RULE_CITATIONS[input.validatorName],
    detail: input.detail,
    checkedValue: input.checkedValue,
    evidence: Object.freeze({ ...(input.evidence ?? {}) }),
  })
}

export function verdictPassed(verdict: ValidatorVerdict): boolean {
  return verdict.outcome === VerdictOutcome.Passed
}

export function notApplicableVerdict(checkedValue: string): ValidatorVerdict {
  return makeVerdict({
    outcome: VerdictOutcome.NotApplicable,
    validatorName: "none",
    detail: "this field has no independent validator, so voice confirmation is the only proof",
    checkedValue,
  })
}
