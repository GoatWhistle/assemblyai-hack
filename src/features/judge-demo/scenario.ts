import {
  CandidateStatus,
  type FieldCandidate,
  FieldName,
  type GateDecision,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  policyFor,
  VerdictOutcome,
} from "@/domain"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"

const SESSION = "fixture-lasa-001"

const drugWords = [
  makeWordSpan({ text: "Bisoprolol", startMs: 6800, endMs: 7620, confidence: 1 }),
]

const strengthWords = [
  makeWordSpan({ text: "ten", startMs: 7640, endMs: 7860, confidence: 0.98 }),
  makeWordSpan({ text: "milligrams", startMs: 7880, endMs: 8320, confidence: 0.97 }),
]

const nameWords = [
  makeWordSpan({ text: "Jane", startMs: 1680, endMs: 2040, confidence: 0.94 }),
  makeWordSpan({ text: "Doe", startMs: 2060, endMs: 2380, confidence: 0.92 }),
]

const quantityWords = [
  makeWordSpan({ text: "thirty", startMs: 8340, endMs: 8640, confidence: 0.96 }),
  makeWordSpan({ text: "tablets", startMs: 8660, endMs: 9080, confidence: 0.98 }),
]

export function decisionFor(candidate: FieldCandidate): GateDecision {
  return decide(candidate, policyFor(candidate.field))
}

export const LASA_CANDIDATE: FieldCandidate = makeCandidate({
  candidateId: "cand-drug-1",
  field: FieldName.DrugName,
  rawValue: "Bisoprolol",
  normalizedValue: "bisoprolol",
  provenance: makeProvenance({
    words: drugWords,
    turnOrder: 2,
    transcriptSlice: "Bisoprolol ten milligrams, thirty tablets.",
    sessionId: SESSION,
    sttTurnIsFormatted: true,
  }),
  verdict: makeVerdict({
    outcome: VerdictOutcome.Passed,
    validatorName: "ndc_catalog",
    detail: "bisoprolol fumarate is present in the built catalogue as a nonproprietary name",
    checkedValue: "bisoprolol",
    evidence: { matchedColumn: "nonproprietary_name", saltStripped: "bisoprolol fumarate" },
  }),
  lasa: lasaRiskFor("bisoprolol"),
  status: CandidateStatus.ReadBackPending,
  attempt: 1,
  createdAt: "2026-09-15T09:00:08.400Z",
})

export const LASA_DECISION: GateDecision = decisionFor(LASA_CANDIDATE)

export const NAME_CANDIDATE: FieldCandidate = makeCandidate({
  candidateId: "cand-name-1",
  field: FieldName.PatientName,
  rawValue: "Jane Doe",
  normalizedValue: "Jane Doe",
  provenance: makeProvenance({
    words: nameWords,
    turnOrder: 0,
    transcriptSlice: "Patient is Jane Doe.",
    sessionId: SESSION,
    sttTurnIsFormatted: true,
  }),
  verdict: makeVerdict({
    outcome: VerdictOutcome.NotApplicable,
    validatorName: "none",
    detail: "this field has no independent validator, so voice confirmation is the only proof",
    checkedValue: "Jane Doe",
  }),
  status: CandidateStatus.ConfirmedByVoice,
  attempt: 1,
  createdAt: "2026-09-15T09:00:02.600Z",
})

export const NAME_DECISION: GateDecision = decisionFor(NAME_CANDIDATE)

export const QUANTITY_CANDIDATE: FieldCandidate = makeCandidate({
  candidateId: "cand-qty-1",
  field: FieldName.Quantity,
  rawValue: "thirty tablets",
  normalizedValue: 30,
  provenance: makeProvenance({
    words: quantityWords,
    turnOrder: 2,
    transcriptSlice: "Bisoprolol ten milligrams, thirty tablets.",
    sessionId: SESSION,
    sttTurnIsFormatted: true,
  }),
  verdict: makeVerdict({
    outcome: VerdictOutcome.Passed,
    validatorName: "range_check",
    detail: "30 is an integer within the documented 1-360 bound for quantity",
    checkedValue: "30",
    evidence: { lower: 1, upper: 360, value: 30 },
  }),
  status: CandidateStatus.ReadBackPending,
  attempt: 1,
  createdAt: "2026-09-15T09:00:09.080Z",
})

export const QUANTITY_DECISION: GateDecision = decisionFor(QUANTITY_CANDIDATE)

export const STRENGTH_CANDIDATE: FieldCandidate = makeCandidate({
  candidateId: "cand-strength-1",
  field: FieldName.Strength,
  rawValue: "ten milligrams",
  normalizedValue: "10 mg",
  provenance: makeProvenance({
    words: strengthWords,
    turnOrder: 2,
    transcriptSlice: "Bisoprolol ten milligrams, thirty tablets.",
    sessionId: SESSION,
    sttTurnIsFormatted: true,
  }),
  verdict: makeVerdict({
    outcome: VerdictOutcome.Passed,
    validatorName: "combo_consistency",
    detail: "bisoprolol fumarate x 10 mg x TABLET x ORAL exists in the built catalogue",
    checkedValue: "10 mg",
    evidence: {
      drugName: "bisoprolol fumarate",
      strength: "10 mg",
      dosageForm: "TABLET",
      route: "ORAL",
    },
  }),
  status: CandidateStatus.ReadBackPending,
  attempt: 1,
  createdAt: "2026-09-15T09:00:08.320Z",
})
