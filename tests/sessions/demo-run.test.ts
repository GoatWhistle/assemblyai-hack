import { describe, expect, it } from "vitest"
import { ConfirmationReason, FieldName, GateAction, PAIR_RULE_FLAG, ReasonCode } from "@/domain"
import { policyFor } from "@/domain/policy"
import { DEMO_ARM_POLICIES, DEMO_RECOGNIZED, DEMO_SPOKEN, runDemo } from "@/sessions"

describe("the two demo arms differ by exactly the pair rule", () => {
  const [pair, plain] = runDemo("demo-test")

  it("the arm policies differ in one key, and that key is the pair rule", () => {
    const withRule = DEMO_ARM_POLICIES.pair_rule
    const without = DEMO_ARM_POLICIES.plain_read_back
    const differing = (Object.keys(withRule) as (keyof typeof withRule)[]).filter(
      (key) => withRule[key] !== without[key],
    )
    expect(differing).toEqual([PAIR_RULE_FLAG])
    expect(withRule).toEqual(policyFor(FieldName.DrugName))
    expect(
      without.readBackAlways,
      "the arm without the pair rule keeps the shipped read-back",
    ).toBe(true)
  })

  it("runs the same candidate both ways at confidence 1.0 with the validator passed", () => {
    for (const arm of [pair, plain]) {
      expect(arm?.recognizedValue).toBe(DEMO_RECOGNIZED)
      expect(arm?.spokenByHuman).toBe(DEMO_SPOKEN)
      expect(arm?.minConfidence).toBe(1.0)
      expect(arm?.validatorOutcome).toBe("passed")
    }
  })

  it(`without the pair rule: a plain read-back, a reflex yes, and ${DEMO_RECOGNIZED} is ordered`, () => {
    expect(plain?.pairRule).toBe(false)
    expect(plain?.action).toBe(GateAction.AskConfirm)
    expect(plain?.reasonCode).toBe(ReasonCode.ReadBackRequired)
    expect(plain?.agentUtterance.toLowerCase()).not.toContain("hydromorphone")
    expect(plain?.exchanges.map((e) => e.reasonCode)).toEqual([
      ConfirmationReason.CallerAffirmed,
    ])
    expect(plain?.writtenValue).toBe(DEMO_RECOGNIZED)
    expect(plain?.wrongDrugOrdered).toBe(true)
  })

  it(`with the pair rule: the yes is ${ConfirmationReason.LasaNamedAnswerRequired}, the named answer corrects the order`, () => {
    expect(pair?.pairRule).toBe(true)
    expect(pair?.action).toBe(GateAction.AskDisambiguate)
    expect(pair?.reasonCode).toBe(ReasonCode.LasaHit)
    expect(pair?.agentUtterance.toLowerCase()).toContain("hydromorphone")
    expect(pair?.exchanges.map((e) => e.reasonCode)).toEqual([
      ConfirmationReason.LasaNamedAnswerRequired,
      ConfirmationReason.CallerNamedPartner,
    ])
    expect(pair?.writtenValue).toBe(DEMO_SPOKEN)
    expect(pair?.wrongDrugOrdered).toBe(false)
  })
})
