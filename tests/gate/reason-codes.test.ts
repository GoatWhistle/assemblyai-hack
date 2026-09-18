import { describe, expect, it } from "vitest"
import {
  Criticality,
  FIELD_POLICIES,
  FieldName,
  GateAction,
  LasaSource,
  makeLasaRisk,
  policyFor,
  REASON_CODES,
  ReasonCode,
  VerdictOutcome,
} from "@/domain"
import { decide } from "@/gate"
import { candidateFor } from "./factory"

function decisionFor(reasonCode: ReasonCode) {
  switch (reasonCode) {
    case ReasonCode.ValidatorPassedHighConf:
      return decide(
        candidateFor({
          field: FieldName.Refills,
          normalizedValue: 2,
          validatorName: "range_check",
        }),
        policyFor(FieldName.Refills),
      )
    case ReasonCode.NormalizeFailed:
      return decide(
        candidateFor({ field: FieldName.Quantity, normalizedValue: null }),
        policyFor(FieldName.Quantity),
      )
    case ReasonCode.ValidatorChecksum:
      return decide(
        candidateFor({
          field: FieldName.PrescriberNpi,
          outcome: VerdictOutcome.FailedChecksum,
        }),
        policyFor(FieldName.PrescriberNpi),
      )
    case ReasonCode.ValidatorFormat:
      return decide(
        candidateFor({ field: FieldName.PrescriberDea, outcome: VerdictOutcome.FormatInvalid }),
        policyFor(FieldName.PrescriberDea),
      )
    case ReasonCode.ValidatorCatalog:
      return decide(
        candidateFor({ field: FieldName.DrugName, outcome: VerdictOutcome.NotInCatalog }),
        policyFor(FieldName.DrugName),
      )
    case ReasonCode.ValidatorCombo:
      return decide(
        candidateFor({ field: FieldName.Strength, outcome: VerdictOutcome.InconsistentCombo }),
        policyFor(FieldName.Strength),
      )
    case ReasonCode.LasaHit:
      return decide(
        candidateFor({
          field: FieldName.DrugName,
          confidence: 1.0,
          lasa: makeLasaRisk({
            matchedTerm: "Bisoprolol",
            confusableWith: ["Lisinopril"],
            source: LasaSource.Ismp2023,
          }),
        }),
        policyFor(FieldName.DrugName),
      )
    case ReasonCode.LowConfidence:
      return decide(
        candidateFor({ field: FieldName.DrugName, confidence: 0.5 }),
        policyFor(FieldName.DrugName),
      )
    case ReasonCode.ReadBackRequired:
      return decide(
        candidateFor({
          field: FieldName.Quantity,
          normalizedValue: 30,
          validatorName: "range_check",
        }),
        policyFor(FieldName.Quantity),
      )
    case ReasonCode.NoValidator:
      return decide(
        candidateFor({
          field: FieldName.PatientName,
          outcome: VerdictOutcome.NotApplicable,
          validatorName: "none",
        }),
        policyFor(FieldName.PatientName),
      )
    case ReasonCode.SpellOutAfterSecondFailure:
      return decide(
        candidateFor({
          field: FieldName.DrugName,
          confidence: 0.4,
          attempt: policyFor(FieldName.DrugName).maxAttemptsBeforeSpellout,
        }),
        policyFor(FieldName.DrugName),
      )
    case ReasonCode.EscalateAfterThirdFailure:
      return decide(
        candidateFor({
          field: FieldName.DrugName,
          attempt: policyFor(FieldName.DrugName).maxAttemptsBeforeEscalation,
        }),
        policyFor(FieldName.DrugName),
      )
    case ReasonCode.AbortNonCritical:
      return decide(
        candidateFor({
          field: FieldName.DaysSupply,
          attempt: policyFor(FieldName.DaysSupply).maxAttemptsBeforeEscalation,
        }),
        policyFor(FieldName.DaysSupply),
      )
    default:
      throw new Error(`no scenario is defined for ${reasonCode}`)
  }
}

describe("reason codes", () => {
  for (const reasonCode of REASON_CODES) {
    it(`emits ${reasonCode}`, () => {
      expect(decisionFor(reasonCode).reasonCode).toBe(reasonCode)
    })
  }

  it("every reason code has a scenario", () => {
    expect(REASON_CODES.length).toBe(13)
  })

  it("every decision carries a non-empty utterance", () => {
    for (const reasonCode of REASON_CODES) {
      expect(decisionFor(reasonCode).agentUtterance.length).toBeGreaterThan(0)
    }
  })
})

describe("policy table", () => {
  it("a field with no validator must be read back", () => {
    for (const policy of FIELD_POLICIES.values()) {
      if (policy.validator === "none") {
        expect(
          policy.readBackAlways,
          `${policy.field}: no validator and no mandatory read-back means the value would enter the order unverified`,
        ).toBe(true)
      }
    }
  })

  it("min attempts before spellout stays below escalation for critical fields", () => {
    for (const policy of FIELD_POLICIES.values()) {
      if (policy.criticality === Criticality.Critical) {
        expect(policy.maxAttemptsBeforeSpellout).toBeLessThanOrEqual(
          policy.maxAttemptsBeforeEscalation,
        )
      }
    }
  })

  it("checks the pair table on the drug name, and only where the table can match", () => {
    const checked = [...FIELD_POLICIES.values()]
      .filter((p) => p.lasaChecked)
      .map((p) => p.field)
    expect(
      checked,
      "the pair table indexes drug names, so that field must be checked",
    ).toContain(FieldName.DrugName)
    expect(
      checked,
      "strength once carried this flag while the pair table held no strength values, so the branch could never fire; a flag that cannot fire is a claim the gate does not honour",
    ).toEqual([FieldName.DrugName])
  })

  it("thresholds sit inside the unit interval", () => {
    for (const policy of FIELD_POLICIES.values()) {
      expect(policy.autoAcceptThreshold).toBeGreaterThan(0)
      expect(policy.autoAcceptThreshold).toBeLessThanOrEqual(1)
    }
  })

  it("non accept decisions never claim a validator confirmation mode", () => {
    for (const reasonCode of REASON_CODES) {
      const decision = decisionFor(reasonCode)
      if (decision.action !== GateAction.Accept) {
        expect(decision.confirmationMode).not.toBe("validator")
      }
    }
  })
})
