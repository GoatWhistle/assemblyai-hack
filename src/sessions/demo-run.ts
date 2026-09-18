import {
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

export const DEMO_SPOKEN = "lisinopril"
export const DEMO_RECOGNIZED = "bisoprolol"

export type DemoOutcome = {
  readonly gateEnabled: boolean
  readonly spokenByHuman: string
  readonly recognizedValue: string
  readonly minConfidence: number
  readonly validatorOutcome: string
  readonly action: string
  readonly reasonCode: string
  readonly agentUtterance: string
  readonly writtenToOrder: boolean
  readonly wrongDrugOrdered: boolean
}

function demoCandidate(sessionId: string): FieldCandidate {
  const words = [
    makeWordSpan({ text: "Bisoprolol", startMs: 4120, endMs: 4890, confidence: 1.0 }),
  ]
  return makeCandidate({
    candidateId: `${sessionId}-drug`,
    field: FieldName.DrugName,
    rawValue: "Bisoprolol",
    normalizedValue: DEMO_RECOGNIZED,
    provenance: makeProvenance({
      words,
      turnOrder: 3,
      transcriptSlice: "Bisoprolol",
      sessionId,
      sttTurnIsFormatted: false,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "ndc_catalog",
      detail: "bisoprolol resolves to bisoprolol fumarate in the built catalogue",
      checkedValue: DEMO_RECOGNIZED,
      evidence: { resolvedTo: "bisoprolol fumarate", hasCheckDigit: false },
    }),
    lasa: lasaRiskFor(DEMO_RECOGNIZED),
    attempt: 1,
  })
}

export function runDemo(sessionId: string): readonly DemoOutcome[] {
  const candidate = demoCandidate(sessionId)
  const policy = policyFor(FieldName.DrugName)

  const gated: GateDecision = decide(candidate, policy)

  const on: DemoOutcome = {
    gateEnabled: true,
    spokenByHuman: DEMO_SPOKEN,
    recognizedValue: DEMO_RECOGNIZED,
    minConfidence: candidate.provenance.minConfidence,
    validatorOutcome: candidate.verdict.outcome,
    action: gated.action,
    reasonCode: gated.reasonCode,
    agentUtterance: gated.agentUtterance,
    writtenToOrder: false,
    wrongDrugOrdered: false,
  }

  const off: DemoOutcome = {
    gateEnabled: false,
    spokenByHuman: DEMO_SPOKEN,
    recognizedValue: DEMO_RECOGNIZED,
    minConfidence: candidate.provenance.minConfidence,
    validatorOutcome: candidate.verdict.outcome,
    action: "accept",
    reasonCode: "GATE_DISABLED_FOR_COMPARISON",
    agentUtterance: `Got it, the drug name is ${DEMO_RECOGNIZED}.`,
    writtenToOrder: true,
    wrongDrugOrdered: true,
  }

  return [on, off]
}
