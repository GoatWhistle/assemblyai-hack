import { describe, expect, it } from "vitest"
import { FieldName, policyFor, ReasonCode, VerdictOutcome } from "@/domain"
import { decide } from "@/gate"
import { recoveredNames } from "@/gate/utterance"
import { candidateFor } from "./factory"

describe("a catalogue miss speaks the name it recovered", () => {
  it("catalog miss names the recovered medicine when the validator found one", () => {
    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "venorelbine",
      confidence: 1,
      outcome: VerdictOutcome.NotInCatalog,
      evidence: { skeleton: "vnrlbn", skeletonNeighbours: "vinorelbine" },
    })

    const decision = decide(candidate, policyFor(FieldName.DrugName))

    expect(decision.reasonCode).toBe(ReasonCode.ValidatorCatalog)
    expect(
      decision.agentUtterance,
      "the recovered name is computed and then never spoken, so the one-turn correction the mechanism exists for cannot happen",
    ).toContain("vinorelbine")
    expect(decision.agentUtterance).toContain("venorelbine")
  })

  it("catalog miss asks plainly when no name was recovered", () => {
    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "Zolpidrex",
      confidence: 0.99,
      outcome: VerdictOutcome.NotInCatalog,
    })

    const decision = decide(candidate, policyFor(FieldName.DrugName))

    expect(
      decision.agentUtterance,
      "with nothing recovered the agent must not imply it holds a closest name",
    ).not.toContain("closest name")
    expect(decision.agentUtterance).toContain("spell the first few letters")
  })

  it("catalog miss offers every recovered name rather than picking one", () => {
    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "cefazoline",
      confidence: 1,
      outcome: VerdictOutcome.NotInCatalog,
      evidence: { skeletonNeighbours: "cefazolin, cefazolin sodium" },
    })

    const decision = decide(candidate, policyFor(FieldName.DrugName))

    expect(decision.agentUtterance).toContain("cefazolin")
    expect(decision.agentUtterance).toContain("cefazolin sodium")
    expect(
      decision.agentUtterance.toLowerCase(),
      "asserting one of several recovered names would overstate a mechanism that recovered 10 of 21 recorded errors",
    ).toContain("did you mean")
  })

  it("reads the recovered names out of the verdict the validator wrote", () => {
    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "venorelbine",
      outcome: VerdictOutcome.NotInCatalog,
      evidence: { skeletonNeighbours: "vinorelbine" },
    })

    expect([...recoveredNames(candidate)]).toEqual(["vinorelbine"])
  })

  it("recovers nothing when the validator recorded nothing", () => {
    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "Zolpidrex",
      outcome: VerdictOutcome.NotInCatalog,
    })

    expect([...recoveredNames(candidate)]).toEqual([])
  })

  it("ignores an empty recovery rather than offering a blank name aloud", () => {
    const candidate = candidateFor({
      field: FieldName.DrugName,
      rawValue: "Zolpidrex",
      outcome: VerdictOutcome.NotInCatalog,
      evidence: { skeletonNeighbours: "  ,  " },
    })

    expect([...recoveredNames(candidate)]).toEqual([])
    expect(decide(candidate, policyFor(FieldName.DrugName)).agentUtterance).not.toContain(
      "closest name",
    )
  })
})
