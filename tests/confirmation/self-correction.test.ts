import { describe, expect, it } from "vitest"
import {
  retractionOf,
  sameKindFor,
  spokenSupportVerdict,
  type TurnRecord,
} from "@/confirmation"
import {
  FieldName,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  policyFor,
  RETRACTED_VALUE_CODE,
  ReasonCode,
  type ValidatorVerdict,
  VerdictOutcome,
} from "@/domain"
import { decide } from "@/gate"

const DRUGS = new Set(["lisinopril", "losartan", "metformin", "warfarin"])
const isDrug = (token: string): boolean => DRUGS.has(token)

const PASSED: ValidatorVerdict = makeVerdict({
  outcome: VerdictOutcome.Passed,
  validatorName: "ndc_catalog",
  detail: "fixture",
  checkedValue: "fixture",
})

function turn(transcript: string): TurnRecord {
  return {
    turnOrder: 1,
    transcript,
    isFormatted: false,
    words: transcript.split(" ").map((text, index) =>
      makeWordSpan({
        text,
        startMs: 1000 + index * 300,
        endMs: 1200 + index * 300,
        confidence: 0.98,
      }),
    ),
  }
}

function judge(
  transcript: string,
  value: string,
  field: FieldName = FieldName.DrugName,
): ValidatorVerdict {
  return spokenSupportVerdict({
    field,
    value,
    turn: turn(transcript),
    fieldVerdict: PASSED,
    sameKind: sameKindFor(field, isDrug),
  })
}

const CORRECTED = "lisinopril no wait losartan"

describe("a caller who corrects themselves inside one utterance", () => {
  it("accepts the value the caller settled on", () => {
    expect(judge(CORRECTED, "losartan")).toBe(PASSED)
  })

  it(`${RETRACTED_VALUE_CODE}: refuses the value the caller took back, which used to be the known gap`, () => {
    const verdict = judge(CORRECTED, "lisinopril")
    expect(verdict.outcome).toBe(VerdictOutcome.InconsistentCombo)
    expect(verdict.validatorName).toBe("spoken_support")
    expect(verdict.evidence.supportCode).toBe(RETRACTED_VALUE_CODE)
    expect(verdict.evidence.replacement).toBe("losartan")
  })

  it("does not treat a value said twice as taken back", () => {
    expect(judge("metformin then metformin again", "metformin")).toBe(PASSED)
  })

  it("still refuses a value nobody said, as unsupported rather than retracted", () => {
    const verdict = judge(CORRECTED, "warfarin")
    expect(verdict.validatorName).toBe("spoken_support")
    expect(verdict.evidence.supportCode).toBeUndefined()
  })
})

describe("every published correction marker, and the ones that must not fire", () => {
  for (const transcript of [
    "lisinopril no wait losartan",
    "lisinopril sorry losartan",
    "lisinopril I mean losartan",
    "lisinopril, actually, losartan",
    "lisinopril scratch that losartan",
    "not lisinopril, losartan",
  ]) {
    it(`${RETRACTED_VALUE_CODE}: "${transcript}" takes lisinopril back`, () => {
      expect(judge(transcript, "lisinopril").evidence.supportCode).toBe(RETRACTED_VALUE_CODE)
      expect(judge(transcript, "losartan")).toBe(PASSED)
    })
  }

  for (const transcript of [
    "lisinopril, not losartan",
    "lisinopril sorry about that",
    "lisinopril ten milligrams sorry twenty tablets",
    "losartan no wait lisinopril, lisinopril",
  ]) {
    it(`"${transcript}" keeps lisinopril`, () => {
      expect(judge(transcript, "lisinopril")).toBe(PASSED)
    })
  }

  it(`${RETRACTED_VALUE_CODE}: a number corrected by a number`, () => {
    expect(
      judge("ten milligrams, sorry, twenty milligrams", "10 mg", FieldName.Strength).evidence
        .supportCode,
    ).toBe(RETRACTED_VALUE_CODE)
    expect(judge("ten milligrams, sorry, twenty milligrams", "20 mg", FieldName.Strength)).toBe(
      PASSED,
    )
  })

  it("finds no replacement for a field it has no kind test for, and says nothing", () => {
    expect(
      retractionOf({
        value: "Jane",
        field: FieldName.PatientName,
        text: "Jane sorry Joan",
        sameKind: sameKindFor(FieldName.PatientName, isDrug),
      }),
    ).toBeNull()
  })
})

describe("a retracted value enters the validator-failure branch, not a fourth one", () => {
  it(`${ReasonCode.ValidatorCombo}: the gate asks which part to change`, () => {
    const verdict = judge(CORRECTED, "lisinopril")
    const words = [
      makeWordSpan({ text: "lisinopril", startMs: 1000, endMs: 1200, confidence: 1 }),
    ]
    const decision = decide(
      makeCandidate({
        candidateId: "c-retracted",
        field: FieldName.DrugName,
        rawValue: "lisinopril",
        normalizedValue: "lisinopril",
        provenance: makeProvenance({
          words,
          turnOrder: 1,
          transcriptSlice: "lisinopril",
          sessionId: "s",
        }),
        verdict,
        attempt: 1,
      }),
      policyFor(FieldName.DrugName),
    )
    expect(decision.reasonCode).toBe(ReasonCode.ValidatorCombo)
    expect(decision.agentUtterance).toContain("losartan")
  })
})
