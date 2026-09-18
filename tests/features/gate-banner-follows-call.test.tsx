import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { FieldCandidate, GateDecision } from "@/domain"
import { IntakeScreen } from "@/features/intake/intake-screen"
import { SessionPhase } from "@/features/intake/session-status"
import {
  LASA_CANDIDATE,
  LASA_DECISION,
  NAME_CANDIDATE,
  NAME_DECISION,
} from "@/features/judge-demo/scenario"
import { initialContext } from "@/features/read-back/read-back-machine"

const decisions = new Map<string, GateDecision>([
  [NAME_DECISION.candidateId, NAME_DECISION],
  [LASA_DECISION.candidateId, LASA_DECISION],
])

function props(candidates: readonly FieldCandidate[]) {
  return {
    candidates,
    decisions,
    transcript: [],
    readBack: initialContext(),
    phase: SessionPhase.Live,
    fault: null,
    echoDiscards: 0,
    level: 0,
    agentSpeaking: false,
    elapsedMs: 0,
  }
}

describe("the gate banner follows the call, not the first thing that happened in it", () => {
  it("shows a decision as soon as candidates arrive, with nobody clicking anything", () => {
    const { rerender } = render(<IntakeScreen {...props([])} />)
    rerender(<IntakeScreen {...props([NAME_CANDIDATE])} />)
    expect(
      document.body.textContent ?? "",
      "a call starts with no candidates, so a selection captured once from candidates[0] stays null for the whole session; the banner is the demonstration of the refusal and would render nothing",
    ).toContain(NAME_DECISION.agentUtterance)
  })

  it("moves to the newest decision as the conversation advances", () => {
    const { rerender } = render(<IntakeScreen {...props([NAME_CANDIDATE])} />)
    rerender(<IntakeScreen {...props([NAME_CANDIDATE, LASA_CANDIDATE])} />)
    expect(
      document.body.textContent ?? "",
      "the LASA refusal is the most consequential verdict in the product; a banner still showing the patient name from a minute ago is a stale screen presented as live",
    ).toContain(LASA_DECISION.agentUtterance)
  })

  it("keeps showing what the operator picked, even when a newer candidate arrives", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<IntakeScreen {...props([NAME_CANDIDATE, LASA_CANDIDATE])} />)
    const cards = screen.getAllByRole("button", { name: /patient name/i })
    const target = cards[0]
    if (target === undefined) {
      throw new Error("no field card for the patient name was rendered")
    }
    await user.click(target)
    rerender(<IntakeScreen {...props([NAME_CANDIDATE, LASA_CANDIDATE])} />)
    expect(
      document.body.textContent ?? "",
      "following the newest decision must not override a deliberate choice, or an operator reading one field is yanked away mid-sentence",
    ).toContain(NAME_DECISION.agentUtterance)
  })
})
