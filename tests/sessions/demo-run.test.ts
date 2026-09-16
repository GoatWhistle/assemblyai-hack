import { describe, expect, it } from "vitest"
import { GateAction, ReasonCode } from "@/domain"
import { DEMO_RECOGNIZED, DEMO_SPOKEN, runDemo } from "@/sessions"

describe("the gate on versus gate off demo", () => {
  const [on, off] = runDemo("demo-test")

  it("runs the same candidate both ways", () => {
    expect(on?.recognizedValue).toBe(DEMO_RECOGNIZED)
    expect(off?.recognizedValue).toBe(DEMO_RECOGNIZED)
    expect(on?.spokenByHuman).toBe(DEMO_SPOKEN)
    expect(on?.minConfidence).toBe(1.0)
    expect(off?.minConfidence).toBe(1.0)
  })

  it("with the gate on the wrong drug is never ordered", () => {
    expect(on?.action).toBe(GateAction.AskDisambiguate)
    expect(on?.reasonCode).toBe(ReasonCode.LasaHit)
    expect(on?.writtenToOrder).toBe(false)
    expect(on?.wrongDrugOrdered).toBe(false)
    expect(on?.agentUtterance.toLowerCase()).toContain("lisinopril")
  })

  it("with the gate off the wrong drug is ordered at confidence 1.0", () => {
    expect(off?.action).toBe("accept")
    expect(off?.writtenToOrder).toBe(true)
    expect(off?.wrongDrugOrdered).toBe(true)
  })

  it("shows the validator passed in both arms, so confidence and validator are not the catch", () => {
    expect(on?.validatorOutcome).toBe("passed")
    expect(off?.validatorOutcome).toBe("passed")
  })
})
