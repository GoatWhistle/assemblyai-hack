import { Criticality, FieldName, type SpellOutStyle } from "./enums"
import { UnknownFieldError } from "./errors"
import type { ValidatorName } from "./verdict"

export type FieldPolicy = {
  readonly field: FieldName
  readonly criticality: Criticality
  readonly autoAcceptThreshold: number
  readonly validator: ValidatorName
  readonly readBackAlways: boolean
  readonly lasaChecked: boolean
  readonly maxAttemptsBeforeSpellout: number
  readonly maxAttemptsBeforeEscalation: number
  readonly spellOutStyle: SpellOutStyle
}

const POLICIES: readonly FieldPolicy[] = [
  {
    field: FieldName.DrugName,
    criticality: Criticality.Critical,
    autoAcceptThreshold: 0.95,
    validator: "ndc_catalog",
    readBackAlways: true,
    lasaChecked: true,
    maxAttemptsBeforeSpellout: 3,
    maxAttemptsBeforeEscalation: 4,
    spellOutStyle: "nato",
  },
  {
    field: FieldName.Strength,
    criticality: Criticality.Critical,
    autoAcceptThreshold: 0.92,
    validator: "combo_consistency",
    readBackAlways: true,
    lasaChecked: true,
    maxAttemptsBeforeSpellout: 3,
    maxAttemptsBeforeEscalation: 4,
    spellOutStyle: "digits",
  },
  {
    field: FieldName.DosageForm,
    criticality: Criticality.Critical,
    autoAcceptThreshold: 0.9,
    validator: "combo_consistency",
    readBackAlways: false,
    lasaChecked: false,
    maxAttemptsBeforeSpellout: 3,
    maxAttemptsBeforeEscalation: 4,
    spellOutStyle: "none",
  },
  {
    field: FieldName.Route,
    criticality: Criticality.Critical,
    autoAcceptThreshold: 0.9,
    validator: "combo_consistency",
    readBackAlways: false,
    lasaChecked: false,
    maxAttemptsBeforeSpellout: 3,
    maxAttemptsBeforeEscalation: 4,
    spellOutStyle: "none",
  },
  {
    field: FieldName.Quantity,
    criticality: Criticality.Critical,
    autoAcceptThreshold: 0.92,
    validator: "range_check",
    readBackAlways: true,
    lasaChecked: false,
    maxAttemptsBeforeSpellout: 3,
    maxAttemptsBeforeEscalation: 4,
    spellOutStyle: "digits",
  },
  {
    field: FieldName.Sig,
    criticality: Criticality.Critical,
    autoAcceptThreshold: 0.93,
    validator: "sig_abbrev",
    readBackAlways: true,
    lasaChecked: false,
    maxAttemptsBeforeSpellout: 3,
    maxAttemptsBeforeEscalation: 4,
    spellOutStyle: "none",
  },
  {
    field: FieldName.PrescriberNpi,
    criticality: Criticality.Critical,
    autoAcceptThreshold: 0.9,
    validator: "npi_luhn",
    readBackAlways: false,
    lasaChecked: false,
    maxAttemptsBeforeSpellout: 3,
    maxAttemptsBeforeEscalation: 4,
    spellOutStyle: "digits",
  },
  {
    field: FieldName.PrescriberDea,
    criticality: Criticality.Critical,
    autoAcceptThreshold: 0.9,
    validator: "dea_mod10",
    readBackAlways: false,
    lasaChecked: false,
    maxAttemptsBeforeSpellout: 3,
    maxAttemptsBeforeEscalation: 4,
    spellOutStyle: "nato",
  },
  {
    field: FieldName.PatientName,
    criticality: Criticality.Important,
    autoAcceptThreshold: 0.9,
    validator: "none",
    readBackAlways: true,
    lasaChecked: false,
    maxAttemptsBeforeSpellout: 3,
    maxAttemptsBeforeEscalation: 4,
    spellOutStyle: "nato",
  },
  {
    field: FieldName.Refills,
    criticality: Criticality.Important,
    autoAcceptThreshold: 0.88,
    validator: "range_check",
    readBackAlways: false,
    lasaChecked: false,
    maxAttemptsBeforeSpellout: 3,
    maxAttemptsBeforeEscalation: 4,
    spellOutStyle: "digits",
  },
  {
    field: FieldName.DaysSupply,
    criticality: Criticality.Low,
    autoAcceptThreshold: 0.85,
    validator: "range_check",
    readBackAlways: false,
    lasaChecked: false,
    maxAttemptsBeforeSpellout: 3,
    maxAttemptsBeforeEscalation: 3,
    spellOutStyle: "digits",
  },
]

export const FIELD_POLICIES: ReadonlyMap<FieldName, FieldPolicy> = new Map(
  POLICIES.map((p) => [p.field, Object.freeze(p)]),
)

export function policyFor(field: FieldName): FieldPolicy {
  const policy = FIELD_POLICIES.get(field)
  if (policy === undefined) {
    throw new UnknownFieldError(field)
  }
  return policy
}

export const CRITICAL_FIELDS: readonly FieldName[] = POLICIES.filter(
  (p) => p.criticality === Criticality.Critical,
).map((p) => p.field)
