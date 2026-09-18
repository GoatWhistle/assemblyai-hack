import { FieldName, GateAction, ReasonCode } from "@/domain"

export const SMOKE_SCOPE =
  "this exercises the server side of the audio path end to end: a recorded fixture's words, the provenance match against the turn they came from, the validator, the pair check and the gate decision. It does not touch src/audio: capture, the worklet, the two resample paths and the echo layers live in the browser and cannot be reached from a script"

export type Expectation = {
  readonly fixture: string
  readonly field: FieldName
  readonly value: string
  readonly hint: string
  readonly action: GateAction
  readonly reasonCode: ReasonCode
  readonly why: string
}

export const EXPECTATIONS: readonly Expectation[] = [
  {
    fixture: "happy-path",
    field: FieldName.DrugName,
    value: "lisinopril",
    hint: "Lisinopril",
    action: GateAction.AskDisambiguate,
    reasonCode: ReasonCode.LasaHit,
    why: "lisinopril is in the curated pair table, so it is re-asked even on a clean dictation at confidence 0.97; a pass without the pair firing here would mean the central mechanism is inert on the happiest path we have",
  },
  {
    fixture: "lasa-catch",
    field: FieldName.DrugName,
    value: "bisoprolol",
    hint: "Bisoprolol",
    action: GateAction.AskDisambiguate,
    reasonCode: ReasonCode.LasaHit,
    why: "the recognizer returned Bisoprolol where the human said Lisinopril; this is the product's whole claim and the fixture exists to prove the gate refuses it",
  },
  {
    fixture: "low-confidence",
    field: FieldName.Quantity,
    value: "thirty",
    hint: "quantity thirty",
    action: GateAction.AskConfirm,
    reasonCode: ReasonCode.LowConfidence,
    why: "0.54 is below the 0.92 quantity threshold, so the confidence branch must fire on recorded words rather than only on assigned ones",
  },
  {
    fixture: "checksum-fail",
    field: FieldName.PrescriberNpi,
    value: "1234567890",
    hint: "one two three four five six seven eight nine zero",
    action: GateAction.AskSpellOut,
    reasonCode: ReasonCode.ValidatorChecksum,
    why: "a Luhn failure must be caught by arithmetic regardless of the 0.95 confidence the recognizer reported over those digits, and a failed checksum makes spell-out mandatory rather than a threshold question",
  },
  {
    fixture: "combo-invalid",
    field: FieldName.DrugName,
    value: "lisinopril",
    hint: "Lisinopril",
    action: GateAction.AskDisambiguate,
    reasonCode: ReasonCode.LasaHit,
    why: "the same pair check must fire on the fixture built for the combination failure, because the branch order puts the catalogue and the pair table ahead of the combination",
  },
]
