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
  type ValidatorName,
  VerdictOutcome,
} from "@/domain"
import { type GateOutcome, outcomeOf } from "@/features/gate-banner/signature"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import { SAY_LINES } from "./say-lines"

export type SayThis = {
  readonly id: string
  readonly say: string
  readonly expected: string
  readonly candidate: FieldCandidate
  readonly decision: GateDecision
  readonly outcome: GateOutcome
}

function candidate(input: {
  id: string
  field: FieldName
  heard: string
  normalized: string
  confidence: number
  outcome: VerdictOutcome
  validator: ValidatorName
}): FieldCandidate {
  return makeCandidate({
    candidateId: input.id,
    field: input.field,
    rawValue: input.heard,
    normalizedValue: input.normalized,
    provenance: makeProvenance({
      words: [
        makeWordSpan({
          text: input.heard,
          startMs: 0,
          endMs: 700,
          confidence: input.confidence,
        }),
      ],
      turnOrder: 1,
      transcriptSlice: input.heard,
      sessionId: "say-these",
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: input.outcome,
      validatorName: input.validator,
      detail: "the expected verdict for this phrase",
      checkedValue: input.normalized,
    }),
    ...(input.field === FieldName.DrugName ? { lasa: lasaRiskFor(input.normalized) } : {}),
    status: CandidateStatus.Proposed,
    attempt: 1,
    createdAt: "2026-09-25T00:00:00.000Z",
  })
}

function phrase(id: string, say: string, expected: string, built: FieldCandidate): SayThis {
  const decision = decide(built, policyFor(built.field))
  return { id, say, expected, candidate: built, decision, outcome: outcomeOf(decision) }
}

export const SAY_THESE: readonly SayThis[] = [
  phrase(
    "clean",
    SAY_LINES.clean,
    "Each value is read back once. Say yes and it is written; the order commits when every critical field is proved.",
    candidate({
      id: "say-clean",
      field: FieldName.DrugName,
      heard: "Lisinopril",
      normalized: "lisinopril",
      confidence: 0.98,
      outcome: VerdictOutcome.Passed,
      validator: "ndc_catalog",
    }),
  ),
  phrase(
    "lasa",
    SAY_LINES.lasa,
    "Asked again even if the recognizer is certain, naming every drug the published list pairs with it. Answer with the name; a yes does not confirm it.",
    candidate({
      id: "say-lasa",
      field: FieldName.DrugName,
      heard: "Hydromorphone",
      normalized: "hydromorphone",
      confidence: 1,
      outcome: VerdictOutcome.Passed,
      validator: "ndc_catalog",
    }),
  ),
  phrase(
    "npi",
    SAY_LINES.npi,
    "Refused by arithmetic before anyone reads it back, then asked for digit by digit.",
    candidate({
      id: "say-npi",
      field: FieldName.PrescriberNpi,
      heard: "1234567890",
      normalized: "1234567890",
      confidence: 0.99,
      outcome: VerdictOutcome.FailedChecksum,
      validator: "npi_luhn",
    }),
  ),
]
