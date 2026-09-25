import { FieldName, GateAction, ReasonCode } from "@/domain"
import type { FieldContext } from "@/sessions"

export const SMOKE_SCOPE =
  "this exercises the server side of the audio path end to end: a synthesised fixture's words, the provenance match against the turn they came from, the validator, the pair check and the gate decision. It does not touch src/audio: capture, the worklet, the two resample paths and the echo layers live in the browser and cannot be reached from a script"

export type Expectation = {
  readonly fixture: string
  readonly field: FieldName
  readonly value: string
  readonly hint: string
  readonly action: GateAction
  readonly reasonCode: ReasonCode
  readonly context?: FieldContext
  readonly why: string
}

export const EXPECTATIONS: readonly Expectation[] = [
  {
    fixture: "happy-path",
    field: FieldName.DrugName,
    value: "lisinopril",
    hint: "Lisinopril",
    action: GateAction.AskConfirm,
    reasonCode: ReasonCode.ReadBackRequired,
    why: "lisinopril is in no pair of the 2023 ISMP list, so a clean dictation at confidence 0.97 reaches the ordinary mandatory read-back and not the pair branch; a pair hit here would mean the table matches names it does not contain",
  },
  {
    fixture: "lasa-catch",
    field: FieldName.DrugName,
    value: "morphine",
    hint: "Morphine",
    action: GateAction.AskDisambiguate,
    reasonCode: ReasonCode.LasaHit,
    why: "the recognizer returned Morphine at certainty 1.00 where the human said hydromorphone; this is the product's whole claim and the fixture exists to prove the gate refuses it",
  },
  {
    fixture: "low-confidence",
    field: FieldName.Quantity,
    value: "thirty",
    hint: "quantity thirty",
    action: GateAction.AskConfirm,
    reasonCode: ReasonCode.LowConfidence,
    why: "0.54 is below the 0.92 quantity threshold, so the confidence branch must fire on fixture words rather than only on a value assigned in a unit test",
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
    field: FieldName.Strength,
    value: "80 mg",
    hint: "eighty milligrams",
    action: GateAction.AskWhichPart,
    reasonCode: ReasonCode.ValidatorCombo,
    context: { drugName: "lisinopril", dosageForm: "TABLET", route: "ORAL" },
    why: "lisinopril is in no published pair, so nothing earlier in the branch order answers first and an 80 mg lisinopril tablet, which the catalogue does not hold, must reach the combination branch end to end",
  },
]
