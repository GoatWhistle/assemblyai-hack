import { FieldName } from "@/domain"

export type Patience = {
  readonly name: string
  readonly minSilence: number
  readonly maxSilence: number
  readonly vadThreshold: number
  readonly why: string
}

export const PatienceName = {
  Dictated: "dictated",
  Measured: "measured",
  Spoken: "spoken",
  Terse: "terse",
} as const

export type PatienceName = (typeof PatienceName)[keyof typeof PatienceName]

export const PATIENCE: Readonly<Record<PatienceName, Patience>> = Object.freeze({
  [PatienceName.Dictated]: Object.freeze({
    name: PatienceName.Dictated,
    minSilence: 1400,
    maxSilence: 4200,
    vadThreshold: 0.45,
    why: "A nine-digit identifier arrives in digit groups with a breath between them. A short endpoint cuts the number in half and the checksum then fails on a value nobody mis-said.",
  }),
  [PatienceName.Measured]: Object.freeze({
    name: PatienceName.Measured,
    minSilence: 900,
    maxSilence: 3000,
    vadThreshold: 0.5,
    why: "A sig or a drug name is read off a label, with a pause while the reader finds the next line. Patience costs a second; a truncated drug name costs the order.",
  }),
  [PatienceName.Spoken]: Object.freeze({
    name: PatienceName.Spoken,
    minSilence: 600,
    maxSilence: 2200,
    vadThreshold: 0.6,
    why: "The stored agent's own default, used for ordinary phrases where neither truncation nor waiting is the likelier failure.",
  }),
  [PatienceName.Terse]: Object.freeze({
    name: PatienceName.Terse,
    minSilence: 320,
    maxSilence: 1200,
    vadThreshold: 0.65,
    why: "A confirmation is one word. Waiting out a two-second silence after a spoken yes is the whole latency budget spent on a token that was already complete.",
  }),
})

export const PATIENCE_BY_FIELD: Readonly<Record<FieldName, PatienceName>> = Object.freeze({
  [FieldName.PrescriberNpi]: PatienceName.Dictated,
  [FieldName.PrescriberDea]: PatienceName.Dictated,
  [FieldName.Sig]: PatienceName.Measured,
  [FieldName.DrugName]: PatienceName.Measured,
  [FieldName.Strength]: PatienceName.Measured,
  [FieldName.PatientName]: PatienceName.Spoken,
  [FieldName.DosageForm]: PatienceName.Terse,
  [FieldName.Route]: PatienceName.Terse,
  [FieldName.Quantity]: PatienceName.Terse,
  [FieldName.Refills]: PatienceName.Terse,
  [FieldName.DaysSupply]: PatienceName.Terse,
})

const CONFIRMATION_PATIENCE: PatienceName = PatienceName.Terse

export const DEFAULT_PATIENCE: PatienceName = PatienceName.Spoken

export function patienceFor(field: FieldName | null, awaitingConfirmation = false): Patience {
  if (awaitingConfirmation) {
    return PATIENCE[CONFIRMATION_PATIENCE]
  }
  if (field === null) {
    return PATIENCE[DEFAULT_PATIENCE]
  }
  return PATIENCE[PATIENCE_BY_FIELD[field]]
}

export function sttPatiencePatch(patience: Patience): Record<string, number> {
  return {
    min_turn_silence: patience.minSilence,
    max_turn_silence: patience.maxSilence,
    vad_threshold: patience.vadThreshold,
  }
}

export const AGENT_PATCH_OMITS =
  "min_silence and max_silence are deliberately absent from the agent patch. The vendor documents that setting either one turns off adaptive pacing and entity-aware waiting for the rest of the session, and entity-aware waiting is what holds a turn through a phone number or a dictated identifier. Patching them per field would re-trigger that disabling on the first switch and undo the reason the stored agent omits them. The recognizer socket is the opposite case: there min_turn_silence and max_turn_silence widen the window for a dictated entity, so sttPatiencePatch still sends them. Source: https://www.assemblyai.com/docs/voice-agents/voice-agent-api/turn-detection-and-interruptions, read 17 September 2026"

export function agentPatiencePatch(patience: Patience): Record<string, unknown> {
  return {
    turn_detection: {
      vad_threshold: patience.vadThreshold,
    },
  }
}
