import { describe, expect, it } from "vitest"
import {
  Criticality,
  FIELD_POLICIES,
  FieldName,
  GateAction,
  isTerminal,
  LasaSource,
  makeLasaRisk,
  policyFor,
  ReasonCode,
  VerdictOutcome,
} from "@/domain"
import { decide } from "@/gate"
import { candidateFor } from "./factory"

describe("gate branches", () => {
  it("lasa hit asks even at perfect confidence", () => {
    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "Bisoprolol",
      normalizedValue: "bisoprolol",
      confidence: 1.0,
      outcome: VerdictOutcome.Passed,
      lasa: makeLasaRisk({
        matchedTerm: "Bisoprolol",
        confusableWith: ["Lisinopril"],
        source: LasaSource.Ismp2023,
        sourceRow: "ISMP List of Confused Drug Names, February 2023: lisinopril - bisoprolol",
      }),
    })

    const decision = decide(candidate, policyFor(FieldName.DrugName))

    expect(candidate.provenance.minConfidence).toBe(1.0)
    expect(candidate.verdict.outcome).toBe(VerdictOutcome.Passed)
    expect(decision.action).toBe(GateAction.AskDisambiguate)
    expect(decision.reasonCode).toBe(ReasonCode.LasaHit)
    expect(decision.agentUtterance).toContain("Lisinopril")
    expect(decision.evidence.note).toBe("asked regardless of confidence by design")
  })

  it("low confidence asks", () => {
    const policy = policyFor(FieldName.DrugName)
    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "lisinopril",
      confidence: policy.autoAcceptThreshold - 0.2,
      outcome: VerdictOutcome.Passed,
    })

    const decision = decide(candidate, policy)

    expect(decision.action).toBe(GateAction.AskConfirm)
    expect(decision.reasonCode).toBe(ReasonCode.LowConfidence)
  })

  it("low confidence at the spellout ceiling asks spell out", () => {
    const policy = policyFor(FieldName.DrugName)
    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "lisinopril",
      confidence: 0.4,
      outcome: VerdictOutcome.Passed,
      attempt: policy.maxAttemptsBeforeSpellout,
    })

    const decision = decide(candidate, policy)

    expect(decision.action).toBe(GateAction.AskSpellOut)
    expect(decision.reasonCode).toBe(ReasonCode.SpellOutAfterSecondFailure)
  })

  it("checksum failure asks spell out", () => {
    const candidate = candidateFor({
      field: FieldName.PrescriberNpi,
      rawValue: "1234567890",
      confidence: 0.99,
      outcome: VerdictOutcome.FailedChecksum,
      validatorName: "npi_luhn",
    })

    const decision = decide(candidate, policyFor(FieldName.PrescriberNpi))

    expect(decision.action).toBe(GateAction.AskSpellOut)
    expect(decision.reasonCode).toBe(ReasonCode.ValidatorChecksum)
  })

  it("format invalid asks spell out", () => {
    const candidate = candidateFor({
      field: FieldName.PrescriberDea,
      rawValue: "A1234567",
      confidence: 0.99,
      outcome: VerdictOutcome.FormatInvalid,
      validatorName: "dea_mod10",
    })

    const decision = decide(candidate, policyFor(FieldName.PrescriberDea))

    expect(decision.action).toBe(GateAction.AskSpellOut)
    expect(decision.reasonCode).toBe(ReasonCode.ValidatorFormat)
  })

  it("catalog miss asks confirm", () => {
    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "Zolpidrex",
      confidence: 0.99,
      outcome: VerdictOutcome.NotInCatalog,
    })

    const decision = decide(candidate, policyFor(FieldName.DrugName))

    expect(decision.action).toBe(GateAction.AskConfirm)
    expect(decision.reasonCode).toBe(ReasonCode.ValidatorCatalog)
    expect(decision.agentUtterance).toContain("Zolpidrex")
  })

  it("inconsistent combo asks which part", () => {
    const candidate = candidateFor({
      field: FieldName.Strength,
      rawValue: "80 mg",
      confidence: 0.99,
      outcome: VerdictOutcome.InconsistentCombo,
      validatorName: "combo_consistency",
      detail: "lisinopril 80 mg TABLET ORAL does not exist; the catalogue lists 10 mg, 20 mg",
      evidence: { drugName: "lisinopril", strength: "80 mg" },
    })

    const decision = decide(candidate, policyFor(FieldName.Strength))

    expect(decision.action).toBe(GateAction.AskWhichPart)
    expect(decision.reasonCode).toBe(ReasonCode.ValidatorCombo)
    expect(decision.agentUtterance).toContain("Which part should I change?")
  })

  it("field without validator asks confirm", () => {
    const candidate = candidateFor({
      field: FieldName.PatientName,
      rawValue: "Jane Doe",
      confidence: 0.99,
      outcome: VerdictOutcome.NotApplicable,
      validatorName: "none",
    })

    const decision = decide(candidate, policyFor(FieldName.PatientName))

    expect(decision.action).toBe(GateAction.AskConfirm)
    expect(decision.reasonCode).toBe(ReasonCode.NoValidator)
  })

  it("read back always asks", () => {
    const candidate = candidateFor({
      field: FieldName.Quantity,
      rawValue: "30",
      normalizedValue: 30,
      confidence: 1.0,
      outcome: VerdictOutcome.Passed,
      validatorName: "range_check",
    })

    const decision = decide(candidate, policyFor(FieldName.Quantity))

    expect(decision.action).toBe(GateAction.AskConfirm)
    expect(decision.reasonCode).toBe(ReasonCode.ReadBackRequired)
  })

  it("normalization failure asks", () => {
    const candidate = candidateFor({
      field: FieldName.Quantity,
      rawValue: "a month's worth",
      normalizedValue: null,
      confidence: 0.99,
      validatorName: "range_check",
    })

    const decision = decide(candidate, policyFor(FieldName.Quantity))

    expect(decision.action).toBe(GateAction.AskConfirm)
    expect(decision.reasonCode).toBe(ReasonCode.NormalizeFailed)
    expect(decision.evidence.rawValue).toBe("a month's worth")
  })

  it("clean pass accepts", () => {
    const candidate = candidateFor({
      field: FieldName.Refills,
      rawValue: "2",
      normalizedValue: 2,
      confidence: 0.99,
      outcome: VerdictOutcome.Passed,
      validatorName: "range_check",
    })

    const decision = decide(candidate, policyFor(FieldName.Refills))

    expect(decision.action).toBe(GateAction.Accept)
    expect(decision.reasonCode).toBe(ReasonCode.ValidatorPassedHighConf)
  })

  it("gate always terminates", () => {
    for (const policy of FIELD_POLICIES.values()) {
      const candidate = candidateFor({
        field: policy.field,
        rawValue: "unparseable",
        normalizedValue: null,
        confidence: 0.1,
        outcome: VerdictOutcome.FailedChecksum,
        attempt: policy.maxAttemptsBeforeEscalation,
      })

      const decision = decide(candidate, policy)

      expect(isTerminal(decision), `${policy.field} did not terminate`).toBe(true)
      if (policy.criticality === Criticality.Critical) {
        expect(decision.action).toBe(GateAction.EscalateHuman)
        expect(decision.reasonCode).toBe(ReasonCode.EscalateAfterThirdFailure)
      } else {
        expect(decision.action).toBe(GateAction.AbortField)
        expect(decision.reasonCode).toBe(ReasonCode.AbortNonCritical)
      }
    }
  })
})
