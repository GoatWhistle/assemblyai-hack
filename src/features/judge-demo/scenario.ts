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
  makeWordSpan({ text: "Morphine", startMs: 6800, endMs: 7620, confidence: 1 }),
]

const strengthWords = [
  makeWordSpan({ text: "two", startMs: 7640, endMs: 7860, confidence: 0.98 }),
  makeWordSpan({ text: "milligrams", startMs: 7880, endMs: 8320, confidence: 0.97 }),
]

const nameWords = [
  makeWordSpan({ text: "Jane", startMs: 1680, endMs: 2040, confidence: 0.94 }),
  makeWordSpan({ text: "Doe", startMs: 2060, endMs: 2380, confidence: 0.92 }),
]

const quantityWords = [
  makeWordSpan({ text: "ten", startMs: 11200, endMs: 11440, confidence: 0.96 }),
  makeWordSpan({ text: "vials", startMs: 11460, endMs: 11900, confidence: 0.98 }),
]

export function decisionFor(candidate: FieldCandidate): GateDecision {
  return decide(candidate, policyFor(candidate.field))
}

export const LASA_CANDIDATE: FieldCandidate = makeCandidate({
  candidateId: "cand-drug-1",
  field: FieldName.DrugName,
  rawValue: "Morphine",
  normalizedValue: "morphine",
  provenance: makeProvenance({
    words: drugWords,
    turnOrder: 2,
    transcriptSlice: "Morphine two milligrams IV every four hours as needed.",
    sessionId: SESSION,
    sttTurnIsFormatted: true,
  }),
  verdict: makeVerdict({
    outcome: VerdictOutcome.Passed,
    validatorName: "ndc_catalog",
    detail: "morphine sulfate is present in the built catalogue as a nonproprietary name",
    checkedValue: "morphine",
    evidence: { matchedColumn: "nonproprietary_name", saltStripped: "morphine sulfate" },
  }),
  lasa: lasaRiskFor("morphine"),
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
  rawValue: "ten vials",
  normalizedValue: 10,
  provenance: makeProvenance({
    words: quantityWords,
    turnOrder: 3,
    transcriptSlice: "Dispense ten vials.",
    sessionId: SESSION,
    sttTurnIsFormatted: true,
  }),
  verdict: makeVerdict({
    outcome: VerdictOutcome.Passed,
    validatorName: "range_check",
    detail: "10 is an integer within the documented 1-360 bound for quantity",
    checkedValue: "10",
    evidence: { lower: 1, upper: 360, value: 10 },
  }),
  status: CandidateStatus.ReadBackPending,
  attempt: 1,
  createdAt: "2026-09-15T09:00:11.900Z",
})

export const QUANTITY_DECISION: GateDecision = decisionFor(QUANTITY_CANDIDATE)

export const STRENGTH_CANDIDATE: FieldCandidate = makeCandidate({
  candidateId: "cand-strength-1",
  field: FieldName.Strength,
  rawValue: "two milligrams",
  normalizedValue: "2 mg",
  provenance: makeProvenance({
    words: strengthWords,
    turnOrder: 2,
    transcriptSlice: "Morphine two milligrams IV every four hours as needed.",
    sessionId: SESSION,
    sttTurnIsFormatted: true,
  }),
  verdict: makeVerdict({
    outcome: VerdictOutcome.Passed,
    validatorName: "combo_consistency",
    detail:
      "morphine sulfate x 2 mg/mL x INJECTION x INTRAVENOUS exists in the built catalogue",
    checkedValue: "2 mg",
    evidence: {
      drugName: "morphine sulfate",
      strength: "2 mg/mL",
      dosageForm: "INJECTION",
      route: "INTRAVENOUS",
    },
  }),
  status: CandidateStatus.ReadBackPending,
  attempt: 1,
  createdAt: "2026-09-15T09:00:08.320Z",
})

export const NAMED_ANSWER_AT_MS = 16200

const answerWords = [
  makeWordSpan({
    text: "Hydromorphone",
    startMs: NAMED_ANSWER_AT_MS,
    endMs: NAMED_ANSWER_AT_MS + 900,
    confidence: 0.97,
  }),
]

export const NAMED_CANDIDATE: FieldCandidate = makeCandidate({
  candidateId: "cand-drug-2",
  field: FieldName.DrugName,
  rawValue: "Hydromorphone",
  normalizedValue: "hydromorphone",
  provenance: makeProvenance({
    words: answerWords,
    turnOrder: 4,
    transcriptSlice: "Hydromorphone.",
    sessionId: SESSION,
    sttTurnIsFormatted: true,
  }),
  verdict: makeVerdict({
    outcome: VerdictOutcome.Passed,
    validatorName: "ndc_catalog",
    detail:
      "hydromorphone hydrochloride is present in the built catalogue as a nonproprietary name",
    checkedValue: "hydromorphone",
    evidence: {
      matchedColumn: "nonproprietary_name",
      saltStripped: "hydromorphone hydrochloride",
    },
  }),
  lasa: lasaRiskFor("hydromorphone"),
  status: CandidateStatus.ReadBackPending,
  attempt: 2,
  createdAt: "2026-09-15T09:00:17.100Z",
})
