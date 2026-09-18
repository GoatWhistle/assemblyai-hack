import {
  type CatalogIndex,
  comboSourceFor,
  deaScheduleFor,
  findDrug,
  neighbourFor,
} from "@/catalog"
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
  validateRefillSchedule,
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
    const neighbour = neighbourFor(index, value)
    const named =
      neighbour === null
        ? ""
        : `; the same consonant skeleton "${neighbour.skeleton}" belongs to ${neighbour.candidates.join(" and ")}, which a vowel substitution would explain`
    return makeVerdict({
      outcome: VerdictOutcome.NotInCatalog,
      validatorName: "ndc_catalog",
      detail: `no prescription product in the built catalogue matches "${value}"${named}`,
      checkedValue: value,
      evidence: {
        catalogueSize: index.file.drugs.length,
        hasCheckDigit: false,
        ...(neighbour === null
          ? {}
          : {
              skeleton: neighbour.skeleton,
              skeletonNeighbours: neighbour.candidates.join(", "),
            }),
      },
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
  const strength = field === FieldName.Strength ? String(value) : context.strength
  const dosageForm = field === FieldName.DosageForm ? String(value) : context.dosageForm
  const route = field === FieldName.Route ? String(value) : context.route
  if (strength === undefined || dosageForm === undefined || route === undefined) {
    const absent = [
      strength === undefined ? "strength" : null,
      dosageForm === undefined ? "dosage form" : null,
      route === undefined ? "route" : null,
    ].filter((name): name is string => name !== null)
    return makeVerdict({
      outcome: VerdictOutcome.NotApplicable,
      validatorName: "combo_consistency",
      detail: `${field} cannot be checked for consistency until ${absent.join(" and ")} is known; a combination is checked as a whole, so checking it against a blank sibling would report a failure of the catalogue rather than of the value`,
      checkedValue: String(value),
      evidence: { field, awaiting: absent.join(", ") },
    })
  }
  return validateCombo({ drugName, strength, dosageForm, route }, comboSourceFor(index))
}

function refillVerdict(
  normalizedValue: NormalizedValue,
  catalog: CatalogIndex,
  context: FieldContext,
): ValidatorVerdict {
  const range = validateRange(FieldName.Refills, normalizedValue as number | string)
  if (range.outcome !== VerdictOutcome.Passed) {
    return range
  }
  const drugName = context.drugName
  if (drugName === undefined) {
    return range
  }
  const schedule = validateRefillSchedule({
    refills: Number(normalizedValue),
    deaSchedule: deaScheduleFor(catalog, drugName),
    drugName,
  })
  return schedule.outcome === VerdictOutcome.NotApplicable ? range : schedule
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
    case FieldName.Refills:
      return refillVerdict(normalizedValue, catalog, context)
    case FieldName.Quantity:
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
