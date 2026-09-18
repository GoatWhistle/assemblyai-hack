import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { GateAction, policyFor, ReasonCode } from "@/domain"
import { JudgeDemo } from "@/features/judge-demo"
import {
  DEMO_ARMS,
  DEMO_DURATION_MS,
  RECOGNIZED_AS,
  RECOGNIZER_CERTAINTY,
  SHIPPED_POLICY,
  SPOKEN_TRUTH,
  THRESHOLD_ONLY_POLICY,
} from "@/features/judge-demo/demo-arms"
import { LASA_CANDIDATE, LASA_DECISION } from "@/features/judge-demo/scenario"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"

describe("the judge-solo requirement", () => {
  it("needs exactly one click and no microphone", async () => {
    render(<JudgeDemo />)
    const play = screen.getByRole("button", { name: /Play the recorded session/i })
    await userEvent.click(play)
    expect(screen.getByRole("button", { name: /Stop/i }).hasAttribute("disabled")).toBe(false)
  })

  it("states the ground truth before anything is played", () => {
    render(<JudgeDemo />)
    expect(screen.getByText(/Ground truth for this recording/i)).toBeDefined()
    expect(screen.getAllByText(new RegExp(SPOKEN_TRUTH)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(new RegExp(RECOGNIZED_AS)).length).toBeGreaterThan(0)
  })

  it("says both drugs pass a catalogue lookup and treat different conditions", () => {
    render(<JudgeDemo />)
    expect(screen.getByText(/treat different conditions/i)).toBeDefined()
  })

  it("runs under forty seconds", () => {
    expect(DEMO_DURATION_MS).toBeLessThanOrEqual(40000)
  })
})

describe("the two arms of the contrast", () => {
  it("shows a gated arm and an ungated arm side by side", () => {
    render(<JudgeDemo />)
    expect(screen.getByRole("region", { name: "Gate on" })).toBeDefined()
    expect(screen.getByRole("region", { name: "Gate off" })).toBeDefined()
  })

  it("marks only the gated arm as the shipped configuration", () => {
    render(<JudgeDemo />)
    expect(screen.getByText("shipped")).toBeDefined()
    expect(screen.getByText("comparison only")).toBeDefined()
  })

  it("writes nothing in the gated arm and the wrong drug in the ungated arm", () => {
    const gated = DEMO_ARMS.find((arm) => arm.id === "gated")
    const ungated = DEMO_ARMS.find((arm) => arm.id === "ungated")
    expect(gated?.outcomeValue).toBe("Nothing yet")
    expect(ungated?.outcomeValue).toContain(RECOGNIZED_AS)
  })

  it("explains the ungated failure as one a threshold cannot catch", () => {
    const ungated = DEMO_ARMS.find((arm) => arm.id === "ungated")
    expect(ungated?.outcomeBody).toContain("no threshold catches it")
    expect(
      ungated?.outcomeBody,
      "the demo must name the certainty it failed at, and at the ceiling rather than near it, so that raising the threshold is visibly not an answer",
    ).toContain(`${RECOGNIZER_CERTAINTY.toFixed(2)}`)
    expect(
      RECOGNIZER_CERTAINTY,
      "a demonstration at 0.99 invites the reply that a threshold of 1.0 would have caught it; the gate refuses at exactly 1.00 and the demo should show that",
    ).toBe(1)
  })

  it("names both alternatives in the gated arm's utterance", () => {
    const gated = DEMO_ARMS.find((arm) => arm.id === "gated")
    expect(gated?.agentLine).toContain(LASA_CANDIDATE.lasa.matchedTerm)
    for (const partner of LASA_CANDIDATE.lasa.confusableWith) {
      expect(gated?.agentLine).toContain(partner)
    }
    expect(gated?.agentLine).toContain("confused-drug-names list")
  })

  it("says the refusal is structural rather than a choice the model made", () => {
    const gated = DEMO_ARMS.find((arm) => arm.id === "gated")
    expect(gated?.outcomeBody).toContain("no code path that writes an unconfirmed value")
  })

  it("states the contrast before anything is played, so the page explains itself at rest", () => {
    render(<JudgeDemo />)
    expect(
      screen.getByText(/nothing will enter/i),
      "the gated arm must say what it refuses to write",
    ).toBeDefined()
    const ungated = DEMO_ARMS.find((arm) => arm.id === "ungated")
    expect(
      screen.getByText(String(ungated?.restingValue)),
      "the ungated arm must say what it would accept",
    ).toBeDefined()
    expect(String(ungated?.restingValue)).toContain(RECOGNIZED_AS)
    expect(
      screen.queryByText(/not reached yet/),
      "an empty placeholder hides the very thing the page exists to show",
    ).toBeNull()
  })

  it("marks the outcome as prospective before playback and settled after it", () => {
    render(<JudgeDemo />)
    expect(screen.getAllByText(/what the agent will say/i).length).toBe(2)
  })
})

describe("the scenario behind the demo", () => {
  it("carries a certainty at or above the drug-name threshold", () => {
    expect(RECOGNIZER_CERTAINTY).toBeGreaterThanOrEqual(
      policyFor(LASA_CANDIDATE.field).autoAcceptThreshold,
    )
    expect(LASA_CANDIDATE.provenance.minConfidence).toBeGreaterThanOrEqual(0.95)
  })

  it("carries a passing validator verdict, so only the pair table objects", () => {
    expect(LASA_CANDIDATE.verdict.outcome).toBe("passed")
    expect(LASA_CANDIDATE.lasa.hit).toBe(true)
  })

  it("resolves to ask_disambiguate with the LASA reason code", () => {
    expect(LASA_DECISION.action).toBe(GateAction.AskDisambiguate)
    expect(LASA_DECISION.reasonCode).toBe(ReasonCode.LasaHit)
  })

  it("records in its evidence that the ask is by design, not by threshold", () => {
    expect(String(LASA_DECISION.evidence.note)).toContain("regardless of confidence")
  })
})

describe("the demonstration computes its refusal instead of printing one", () => {
  it("shows the agent line the gate raised, not a string written into the page", () => {
    const gated = DEMO_ARMS.find((arm) => arm.id === "gated")
    const raised = decide(LASA_CANDIDATE, SHIPPED_POLICY)
    expect(
      gated?.agentLine,
      "the forty-second demonstration is the one screen that explains the product; a hand-typed refusal there is the defect we accuse the field of",
    ).toBe(raised.agentUtterance)
    render(<JudgeDemo />)
    expect(
      screen.getAllByText(raised.agentUtterance).length,
      "the gate's own utterance must appear on the page; the scenario picker renders it a second time, so the count is at least one rather than exactly one",
    ).toBeGreaterThan(0)
  })

  it("shows the comparison line the same function raised with the two proofs switched off", () => {
    const ungated = DEMO_ARMS.find((arm) => arm.id === "ungated")
    const raised = decide(LASA_CANDIDATE, THRESHOLD_ONLY_POLICY)
    expect(ungated?.agentLine).toBe(raised.agentUtterance)
    render(<JudgeDemo />)
    expect(screen.getByText(raised.agentUtterance)).toBeDefined()
  })

  it("differs between the arms only by the pair check and the read-back requirement", () => {
    expect(THRESHOLD_ONLY_POLICY.autoAcceptThreshold).toBe(SHIPPED_POLICY.autoAcceptThreshold)
    expect(THRESHOLD_ONLY_POLICY.validator).toBe(SHIPPED_POLICY.validator)
    expect(THRESHOLD_ONLY_POLICY.lasaChecked).toBe(false)
    expect(SHIPPED_POLICY.lasaChecked).toBe(true)
  })

  it("accepts the wrong drug in the comparison arm, so the contrast is a real outcome", () => {
    const raised = decide(LASA_CANDIDATE, THRESHOLD_ONLY_POLICY)
    expect(
      raised.action,
      "if the comparison arm also refused, the page would claim a contrast it does not have",
    ).toBe(GateAction.Accept)
    expect(raised.reasonCode).toBe(ReasonCode.ValidatorPassedHighConf)
  })

  it("prints each arm's reason code on screen, so the refusal is attributable", () => {
    render(<JudgeDemo />)
    expect(
      screen.getAllByText(ReasonCode.LasaHit).length,
      "the pair reason code must be attributable on screen; the scenario picker prints it too, so the count is at least one rather than exactly one",
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(ReasonCode.ValidatorPassedHighConf).length,
      "the comparison arm's reason code must be attributable on screen",
    ).toBeGreaterThan(0)
  })

  it("takes the pair citation from the curated table rather than from the page", () => {
    expect(LASA_CANDIDATE.lasa.sourceRow).toBe(lasaRiskFor(RECOGNIZED_AS).sourceRow)
    expect(LASA_CANDIDATE.lasa.hit).toBe(true)
  })
})
