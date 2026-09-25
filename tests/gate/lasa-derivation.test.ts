import { describe, expect, it } from "vitest"
import {
  cleanLasaRisk,
  FieldName,
  GateAction,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  policyFor,
  ReasonCode,
  VerdictOutcome,
} from "@/domain"
import { decide } from "@/gate"
import { candidateFor } from "./factory"

function bareCandidate(value: string) {
  return makeCandidate({
    candidateId: "bare-drug",
    field: FieldName.DrugName,
    rawValue: value,
    normalizedValue: value,
    provenance: makeProvenance({
      words: [makeWordSpan({ text: value, startMs: 1000, endMs: 1400, confidence: 1.0 })],
      turnOrder: 2,
      transcriptSlice: value,
      sessionId: "test-session",
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "ndc_catalog",
      detail: "the validator passed this value",
      checkedValue: value,
    }),
  })
}

describe("gate derives the pair risk itself", () => {
  it("lasa is derived from the value when the caller omits it", () => {
    const candidate = bareCandidate("morphine")

    expect(candidate.lasa.hit).toBe(false)
    expect(candidate.provenance.minConfidence).toBe(1.0)

    const decision = decide(candidate, policyFor(FieldName.DrugName))

    expect(decision.action).toBe(GateAction.AskDisambiguate)
    expect(decision.reasonCode).toBe(ReasonCode.LasaHit)
    expect(decision.evidence.confusableWith).toContain("hydromorphone")
  })

  it("lasa is derived from the value when the caller supplies a clean risk", () => {
    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "hydromorphone",
      normalizedValue: "hydromorphone",
      confidence: 1.0,
      lasa: cleanLasaRisk(),
    })

    const decision = decide(candidate, policyFor(FieldName.DrugName))

    expect(decision.reasonCode).toBe(ReasonCode.LasaHit)
    expect(decision.evidence.confusableWith).toContain("morphine")
  })

  it("an unlisted drug with no caller risk is not asked as a pair", () => {
    const decision = decide(bareCandidate("amoxicillin"), policyFor(FieldName.DrugName))

    expect(decision.reasonCode).not.toBe(ReasonCode.LasaHit)
  })

  it("a listed drug is not asked as a pair when the policy switches the rule off", () => {
    const policy = Object.freeze({ ...policyFor(FieldName.DrugName), lasaChecked: false })

    const decision = decide(bareCandidate("morphine"), policy)

    expect(decision.reasonCode).not.toBe(ReasonCode.LasaHit)
  })
})
