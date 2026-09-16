import { type CatalogIndex, comboSourceFor, findDrug } from "@/catalog"
import {
  FieldName,
  makeVerdict,
  type NormalizedValue,
  notApplicableVerdict,
  type ValidatorVerdict,
  VerdictOutcome,
} from "@/domain"
import {
  validateCombo,
  validateDea,
  validateNpi,
  validateRange,
  validateSig,
} from "@/validators"

export type FieldContext = {
  readonly drugName?: string
  readonly strength?: string
  readonly dosageForm?: string
  readonly route?: string
}

function catalogVerdict(value: string, index: CatalogIndex): ValidatorVerdict {
  const match = findDrug(index, value)
  if (match === null) {
    return makeVerdict({
      outcome: VerdictOutcome.NotInCatalog,
      validatorName: "ndc_catalog",
      detail: `no prescription product in the built catalogue matches "${value}"`,
      checkedValue: value,
      evidence: { catalogueSize: index.file.drugs.length, hasCheckDigit: false },
    })
  }
  return makeVerdict({
    outcome: VerdictOutcome.Passed,
    validatorName: "ndc_catalog",
    detail: `"${value}" resolves to ${match.drug.nonproprietaryName} in the built catalogue by ${match.matchKind} match; an NDC carries no check digit, so existence in the catalogue is the proof`,
    checkedValue: value,
    evidence: {
      resolvedTo: match.drug.nonproprietaryName,
      matchKind: match.matchKind,
      comboCount: match.drug.combos.length,
      hasCheckDigit: false,
    },
  })
}

function comboVerdict(
  field: FieldName,
  value: NormalizedValue,
  index: CatalogIndex,
  context: FieldContext,
): ValidatorVerdict {
  const drugName = context.drugName
  if (drugName === undefined) {
    return makeVerdict({
      outcome: VerdictOutcome.NotApplicable,
      validatorName: "combo_consistency",
      detail: `${field} cannot be checked for consistency before the drug name is known`,
      checkedValue: String(value),
      evidence: { field },
    })
  }
  return validateCombo(
    {
      drugName,
      strength: field === FieldName.Strength ? String(value) : (context.strength ?? ""),
      dosageForm: field === FieldName.DosageForm ? String(value) : (context.dosageForm ?? ""),
      route: field === FieldName.Route ? String(value) : (context.route ?? ""),
    },
    comboSourceFor(index),
  )
}

export function validateField(input: {
  field: FieldName
  normalizedValue: NormalizedValue
  catalog: CatalogIndex
  context?: FieldContext
}): ValidatorVerdict {
  const { field, normalizedValue, catalog } = input
  const context = input.context ?? {}
  const checked = String(normalizedValue)

  if (normalizedValue === null) {
    return makeVerdict({
      outcome: VerdictOutcome.FormatInvalid,
      validatorName: "none",
      detail: `${field} could not be normalized, so no validator could run`,
      checkedValue: "",
      evidence: { field },
    })
  }

  switch (field) {
    case FieldName.DrugName:
      return catalogVerdict(checked, catalog)
    case FieldName.Strength:
    case FieldName.DosageForm:
    case FieldName.Route:
      return comboVerdict(field, normalizedValue, catalog, context)
    case FieldName.Quantity:
    case FieldName.Refills:
    case FieldName.DaysSupply:
      return validateRange(field, normalizedValue)
    case FieldName.Sig:
      return validateSig(checked)
    case FieldName.PrescriberNpi:
      return validateNpi(checked)
    case FieldName.PrescriberDea:
      return validateDea(checked)
    case FieldName.PatientName:
      return notApplicableVerdict(checked)
    default:
      return notApplicableVerdict(checked)
  }
}
