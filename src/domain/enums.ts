export const FieldName = {
  DrugName: "drug_name",
  Strength: "strength",
  DosageForm: "dosage_form",
  Route: "route",
  Quantity: "quantity",
  Sig: "sig",
  PrescriberNpi: "prescriber_npi",
  PrescriberDea: "prescriber_dea",
  PatientName: "patient_name",
  Refills: "refills",
  DaysSupply: "days_supply",
} as const

export type FieldName = (typeof FieldName)[keyof typeof FieldName]

export const FIELD_NAMES: readonly FieldName[] = Object.values(FieldName)

export const Criticality = {
  Critical: "critical",
  Important: "important",
  Low: "low",
} as const

export type Criticality = (typeof Criticality)[keyof typeof Criticality]

export const VerdictOutcome = {
  Passed: "passed",
  FailedChecksum: "failed_checksum",
  NotInCatalog: "not_in_catalog",
  FormatInvalid: "format_invalid",
  InconsistentCombo: "inconsistent_combo",
  NotApplicable: "not_applicable",
} as const

export type VerdictOutcome = (typeof VerdictOutcome)[keyof typeof VerdictOutcome]

export const CandidateStatus = {
  Proposed: "proposed",
  GateRejected: "gate_rejected",
  ReadBackPending: "read_back_pending",
  ConfirmedByVoice: "confirmed_by_voice",
  AutoAccepted: "auto_accepted",
  Abandoned: "abandoned",
} as const

export type CandidateStatus = (typeof CandidateStatus)[keyof typeof CandidateStatus]

export const ConfirmationMode = {
  Validator: "validator",
  ReadBack: "read_back",
  SpellOut: "spell_out",
  HumanOverride: "human_override",
} as const

export type ConfirmationMode = (typeof ConfirmationMode)[keyof typeof ConfirmationMode]

export const GateAction = {
  Accept: "accept",
  AskConfirm: "ask_confirm",
  AskDisambiguate: "ask_disambiguate",
  AskWhichPart: "ask_which_part",
  AskSpellOut: "ask_spell_out",
  EscalateHuman: "escalate_human",
  AbortField: "abort_field",
} as const

export type GateAction = (typeof GateAction)[keyof typeof GateAction]

export const TERMINAL_ACTIONS: readonly GateAction[] = [
  GateAction.Accept,
  GateAction.EscalateHuman,
  GateAction.AbortField,
]

export const LasaSource = {
  Ismp2023: "ISMP-2023",
  FdaNameDiff: "FDA-NameDiff",
  None: "none",
} as const

export type LasaSource = (typeof LasaSource)[keyof typeof LasaSource]

export const SpellOutStyle = {
  Nato: "nato",
  Digits: "digits",
  None: "none",
} as const

export type SpellOutStyle = (typeof SpellOutStyle)[keyof typeof SpellOutStyle]
