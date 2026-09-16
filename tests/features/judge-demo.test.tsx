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
  SPOKEN_TRUTH,
} from "@/features/judge-demo/demo-arms"
import { LASA_CANDIDATE, LASA_DECISION } from "@/features/judge-demo/scenario"

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
    expect(ungated?.outcomeValue).toContain("bisoprolol")
  })

  it("explains the ungated failure as one a threshold cannot catch", () => {
    const ungated = DEMO_ARMS.find((arm) => arm.id === "ungated")
    expect(ungated?.outcomeBody).toContain("no threshold catches it")
    expect(ungated?.outcomeBody).toContain("0.99")
  })

  it("names both alternatives in the gated arm's utterance", () => {
    const gated = DEMO_ARMS.find((arm) => arm.id === "gated")
    expect(gated?.agentLine).toContain("Bisoprolol")
    expect(gated?.agentLine).toContain("Lisinopril")
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
    expect(
      screen.getByText(/bisoprolol 10 mg will enter/i),
      "the ungated arm must say what it would accept",
    ).toBeDefined()
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
