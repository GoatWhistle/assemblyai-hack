import { FieldName, makeVerdict, type ValidatorVerdict, VerdictOutcome } from "@/domain"

export type IntegerBounds = { readonly min: number; readonly max: number }

const RANGE_BOUNDS: ReadonlyMap<FieldName, IntegerBounds> = new Map([
  [FieldName.Quantity, { min: 1, max: 360 }],
  [FieldName.Refills, { min: 0, max: 11 }],
  [FieldName.DaysSupply, { min: 1, max: 90 }],
])

export function boundsFor(field: FieldName): IntegerBounds | null {
  return RANGE_BOUNDS.get(field) ?? null
}

export function validateRange(field: FieldName, value: number | string): ValidatorVerdict {
  const bounds = boundsFor(field)
  const checkedValue = String(value)

  if (bounds === null) {
    return makeVerdict({
      outcome: VerdictOutcome.NotApplicable,
      validatorName: "range_check",
      detail: `no integer range is defined for ${field}`,
      checkedValue,
      evidence: { field },
    })
  }

  const numeric = typeof value === "number" ? value : Number(value)

  if (!Number.isInteger(numeric)) {
    return makeVerdict({
      outcome: VerdictOutcome.FormatInvalid,
      validatorName: "range_check",
      detail: `${field} must be a whole number, got ${checkedValue}`,
      checkedValue,
      evidence: { field, min: bounds.min, max: bounds.max },
    })
  }

  const inRange = numeric >= bounds.min && numeric <= bounds.max

  return makeVerdict({
    outcome: inRange ? VerdictOutcome.Passed : VerdictOutcome.FormatInvalid,
    validatorName: "range_check",
    detail: inRange
      ? `${numeric} is within the documented range ${bounds.min}-${bounds.max} for ${field}`
      : `${numeric} is outside the documented range ${bounds.min}-${bounds.max} for ${field}`,
    checkedValue,
    evidence: { field, value: numeric, min: bounds.min, max: bounds.max, inRange },
  })
}
