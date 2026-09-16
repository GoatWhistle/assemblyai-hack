import { type Criticality, FieldName } from "@/domain"

export const FIELD_LABEL: Readonly<Record<FieldName, string>> = Object.freeze({
  [FieldName.DrugName]: "Drug name",
  [FieldName.Strength]: "Strength",
  [FieldName.DosageForm]: "Dosage form",
  [FieldName.Route]: "Route",
  [FieldName.Quantity]: "Quantity",
  [FieldName.Sig]: "Sig",
  [FieldName.PrescriberNpi]: "Prescriber NPI",
  [FieldName.PrescriberDea]: "Prescriber DEA",
  [FieldName.PatientName]: "Patient name",
  [FieldName.Refills]: "Refills",
  [FieldName.DaysSupply]: "Days supply",
})

export const FIELD_PROOF_NOTE: Readonly<Record<FieldName, string>> = Object.freeze({
  [FieldName.DrugName]:
    "Proved by existence in the built NDC catalogue. There is no check digit here.",
  [FieldName.Strength]: "Proved by the drug, strength, form and route tuple existing together.",
  [FieldName.DosageForm]: "Proved as part of the combination, not on its own.",
  [FieldName.Route]: "Proved as part of the combination, not on its own.",
  [FieldName.Quantity]: "Proved by a documented integer range.",
  [FieldName.Sig]: "Checked against the ISMP error-prone abbreviation list.",
  [FieldName.PrescriberNpi]:
    "Proved arithmetically: Luhn mod-10 over 80840 plus the first nine digits.",
  [FieldName.PrescriberDea]: "Proved arithmetically: the mod-10 rule over the seven digits.",
  [FieldName.PatientName]:
    "No checksum and no catalogue exist, so the voice confirmation is the only proof.",
  [FieldName.Refills]: "Proved by a documented integer range.",
  [FieldName.DaysSupply]:
    "Proved by a documented integer range and cross-read against quantity and sig.",
})

export const CRITICALITY_LABEL: Readonly<Record<Criticality, string>> = Object.freeze({
  critical: "Critical",
  important: "Important",
  low: "Low",
})

export const INTAKE_ORDER: readonly FieldName[] = [
  FieldName.PatientName,
  FieldName.DrugName,
  FieldName.Strength,
  FieldName.DosageForm,
  FieldName.Route,
  FieldName.Quantity,
  FieldName.Sig,
  FieldName.Refills,
  FieldName.DaysSupply,
  FieldName.PrescriberNpi,
  FieldName.PrescriberDea,
]
