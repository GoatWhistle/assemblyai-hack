import { describe, expect, it } from "vitest"
import { loadCatalog } from "@/catalog"
import {
  FieldName,
  makeCandidate,
  makeProvenance,
  makeWordSpan,
  policyFor,
  ReasonCode,
  VerdictOutcome,
} from "@/domain"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import { validateField } from "@/sessions"

const catalog = loadCatalog()

function strengthDecision(drugName: string, strength: string) {
  const verdict = validateField({
    field: FieldName.Strength,
    normalizedValue: strength,
    catalog,
    context: { drugName, dosageForm: "TABLET", route: "ORAL" },
  })
  const candidate = makeCandidate({
    candidateId: `dose-${drugName}-${strength}`,
    field: FieldName.Strength,
    rawValue: strength,
    normalizedValue: strength,
    provenance: makeProvenance({
      words: [makeWordSpan({ text: strength, startMs: 0, endMs: 400, confidence: 1 })],
      turnOrder: 1,
      transcriptSlice: strength,
      sessionId: "cross-pair-dose",
    }),
    verdict,
  })
  return { verdict, decision: decide(candidate, policyFor(FieldName.Strength)) }
}

describe("S7: a dose that exists only for the ISMP partner names the partner", () => {
  it(`${ReasonCode.ValidatorCombo}: morphine 2 mg tablet is refused and hydromorphone is named`, () => {
    const { verdict, decision } = strengthDecision("morphine", "2 mg")
    expect(verdict.outcome).toBe(VerdictOutcome.InconsistentCombo)
    expect(decision.reasonCode).toBe(ReasonCode.ValidatorCombo)
    expect(decision.agentUtterance).toBe(
      "morphine does not come as a 2 milligram tablet; hydromorphone does. Which did you mean?",
    )
    expect(decision.evidence.partnersWithCombo).toBe("hydromorphone")
  })

  it(`${ReasonCode.ValidatorCombo}: hydromorphone 15 mg tablet names morphine, the other direction`, () => {
    const { decision } = strengthDecision("hydromorphone", "15 mg")
    expect(decision.reasonCode).toBe(ReasonCode.ValidatorCombo)
    expect(decision.agentUtterance).toMatch(
      /^hydromorphone does not come as a 15 milligram tablet; (.+ or )?morphine( or .+)? do(es)?\. Which did you mean\?$/,
    )
  })

  it(`${ReasonCode.ValidatorCombo}: every partner holding the dose is named, not only the first`, () => {
    const { decision } = strengthDecision("hydromorphone", "10 mg")
    const named = String(decision.evidence.partnersWithCombo).split(", ")
    expect(named.length).toBeGreaterThan(1)
    for (const partner of named) {
      expect(lasaRiskFor("hydromorphone").confusableWith).toContain(partner)
      expect(decision.agentUtterance).toContain(partner)
    }
    expect(decision.agentUtterance).toContain(" do. Which did you mean?")
  })

  it(`${ReasonCode.ValidatorCombo}: a drug with no ISMP partner keeps the plain combination question`, () => {
    expect(lasaRiskFor("lisinopril").confusableWith).toEqual([])
    const { verdict, decision } = strengthDecision("lisinopril", "80 mg")
    expect(decision.reasonCode).toBe(ReasonCode.ValidatorCombo)
    expect(decision.agentUtterance).toBe(`${verdict.detail}. Which part should I change?`)
    expect(decision.agentUtterance).toContain(
      "does not exist; the catalogue lists lisinopril as",
    )
    expect(decision.evidence.partnersWithCombo).toBeUndefined()
  })

  it(`${ReasonCode.ValidatorCombo}: a dose neither drug of the pair comes in keeps the plain question`, () => {
    const { decision } = strengthDecision("morphine", "3 mg")
    expect(decision.reasonCode).toBe(ReasonCode.ValidatorCombo)
    expect(decision.agentUtterance).toMatch(/Which part should I change\?$/)
  })

  it("passes a dose the heard drug does come in, so the partner is never raised on a valid order", () => {
    const { verdict, decision } = strengthDecision("morphine", "15 mg")
    expect(verdict.outcome).toBe(VerdictOutcome.Passed)
    expect(decision.reasonCode).not.toBe(ReasonCode.ValidatorCombo)
  })
})
