import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { FIELD_NAMES, type GateDecision, policyFor } from "@/domain"
import { FIELD_LABEL, FIELD_PROOF_NOTE, INTAKE_ORDER } from "@/features/intake/field-language"
import { IntakeScreen } from "@/features/intake/intake-screen"
import { DISCLAIMER, PHASE_LABEL, SessionPhase } from "@/features/intake/session-status"
import {
  LASA_CANDIDATE,
  LASA_DECISION,
  NAME_CANDIDATE,
  NAME_DECISION,
} from "@/features/judge-demo/scenario"
import { initialContext } from "@/features/read-back/read-back-machine"
import { callerEntry } from "@/features/transcript-view/transcript-entry"

const decisions = new Map<string, GateDecision>([
  [NAME_DECISION.candidateId, NAME_DECISION],
  [LASA_DECISION.candidateId, LASA_DECISION],
])

function renderScreen(overrides: Partial<Parameters<typeof IntakeScreen>[0]> = {}) {
  return render(
    <IntakeScreen
      candidates={[NAME_CANDIDATE, LASA_CANDIDATE]}
      decisions={decisions}
      transcript={[
        callerEntry({
          id: "c0",
          text: "Bisoprolol ten milligrams",
          turnOrder: 2,
          words: LASA_CANDIDATE.provenance.words,
          receivedAtMs: 8400,
        }),
      ]}
      readBack={initialContext()}
      phase={SessionPhase.Idle}
      fault={null}
      echoDiscards={0}
      level={0}
      agentSpeaking={false}
      elapsedMs={0}
      {...overrides}
    />,
  )
}

describe("the intake screen", () => {
  it("names the product and shows no gate vocabulary before a call starts", () => {
    renderScreen({ candidates: [], decisions: new Map(), transcript: [] })
    const brand = screen.getAllByRole("link").find((link) => link.textContent === "Readback")
    expect(
      brand,
      "the brand lockup is one link even though the name is set in two tones",
    ).toBeDefined()
    expect(
      screen.queryByText(/E_LASA_HIT|E_LOW_CONFIDENCE|E_VALIDATOR_CHECKSUM/),
      "reason codes are the explanation page's vocabulary; an idle operator screen has no reason to carry them",
    ).toBeNull()
  })

  it("states the claim in visible text before a call starts, not only to a screen reader", () => {
    renderScreen({ candidates: [], decisions: new Map(), transcript: [] })
    const heading = screen.getByRole("heading", { level: 1 })
    expect(
      heading.className,
      "the landing thesis was announced only to assistive technology; a judge arriving cold read a microphone and no claim",
    ).not.toContain("visually-hidden")
    expect(
      screen.getByText(/high confidence does not protect/i),
      "the product's whole argument is that certainty is not proof, so the screen has to say it before it says anything else",
    ).toBeDefined()
    expect(screen.getByText(/look-alike list is asked again/i)).toBeDefined()
  })

  it("hides the thesis once the order is under way", () => {
    renderScreen()
    const heading = screen.getByRole("heading", { level: 1 })
    expect(
      heading.className,
      "a live call needs the working screen, not a landing pitch, but the document still needs its h1",
    ).toContain("visually-hidden")
  })

  it("carries the medical disclaimer, honestly worded", () => {
    renderScreen()
    expect(screen.getByText(DISCLAIMER.title)).toBeDefined()
    expect(screen.getByText(/Synthetic data only/)).toBeDefined()
    expect(screen.getByText(/No real patients, no real prescriptions/)).toBeDefined()
  })

  it("carries the disclaimer before a call has started too", () => {
    renderScreen({ candidates: [], decisions: new Map(), transcript: [] })
    expect(
      screen.getByText(DISCLAIMER.title),
      "the first screen a judge lands on is the one that most needs the medical disclaimer; it must not live only inside the rail that appears after a session starts",
    ).toBeDefined()
  })

  it("shows one card per proposed field", () => {
    renderScreen()
    expect(screen.getByLabelText("Patient name field card")).toBeDefined()
    expect(screen.getByLabelText("Drug name field card")).toBeDefined()
  })

  it("reports the session phase in words", () => {
    renderScreen({ phase: SessionPhase.Live })
    expect(screen.getByText(PHASE_LABEL.live)).toBeDefined()
  })

  it("offers a stop control on the microphone while live", async () => {
    const onStop = vi.fn()
    renderScreen({ phase: SessionPhase.Live, onStop })
    await userEvent.click(screen.getByRole("button", { name: /stop listening/i }))
    expect(onStop).toHaveBeenCalledOnce()
  })

  it("puts the microphone in front of the operator when idle", async () => {
    const onStart = vi.fn()
    renderScreen({ onStart })
    const trigger = screen.getByRole("button", { name: /start listening/i })
    expect(trigger.getAttribute("aria-pressed")).toBe("false")
    await userEvent.click(trigger)
    expect(onStart).toHaveBeenCalledOnce()
  })

  it("names the microphone state so the operator knows what the line is doing", () => {
    renderScreen({ phase: SessionPhase.Live, agentSpeaking: true })
    expect(screen.getByText(/the agent is speaking/i)).not.toBeNull()
    expect(
      screen.getByText(/held closed on purpose/i),
      "half-duplex must be explained, not hidden",
    ).not.toBeNull()
  })

  it("tells the operator what to say before anything has been proposed", () => {
    renderScreen({ candidates: [], decisions: new Map(), transcript: [] })
    expect(screen.getByText(/say the patient, the drug/i)).toBeDefined()
    expect(
      screen.getByRole("link", { name: /run the recorded session/i }),
      "the recorded route is the one path that always works; offering it as a microphone fallback buries it",
    ).toBeDefined()
    expect(
      screen.queryByRole("link", { name: /no microphone\? watch the recording/i }),
      "framing the replay as a consolation for broken hardware is exactly what this task removed",
    ).toBeNull()
  })

  it("reports how many echo turns were discarded", () => {
    renderScreen({ echoDiscards: 3 })
    expect(
      screen.getByText(/3 turns of the agent hearing itself were dropped/i),
      "the echo defence has to be visible as a count, not asserted in prose",
    ).toBeDefined()
  })

  it("links to the demonstration and the measurements exactly once each", () => {
    renderScreen()
    expect(screen.getAllByRole("link", { name: /^Demonstration$/i })).toHaveLength(1)
    expect(screen.getAllByRole("link", { name: /^Measurements$/i })).toHaveLength(1)
    expect(screen.getByRole("link", { name: /How it works/i })).toBeDefined()
  })

  it("selects a field from the order rail and highlights its span", async () => {
    renderScreen()
    await userEvent.click(screen.getByRole("button", { name: /Drug name pair/i }))
    const pressed = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-pressed") === "true")
    expect(pressed.length).toBeGreaterThan(0)
  })

  it("marks a field in a published pair in the order rail", () => {
    renderScreen()
    expect(screen.getByText("pair")).toBeDefined()
  })
})

describe("field language", () => {
  it("labels every field the domain declares, not merely every field the form lists", () => {
    for (const field of FIELD_NAMES) {
      expect(
        FIELD_LABEL[field]?.length ?? 0,
        `${field} exists in the domain with no label, so it would render as a blank row on the form`,
      ).toBeGreaterThan(0)
      expect(
        FIELD_PROOF_NOTE[field]?.length ?? 0,
        `${field} has no note saying what proves it, which is the decision the policy table forces on every new field`,
      ).toBeGreaterThan(0)
    }
  })

  it("puts every declared field in the intake order rather than silently dropping one", () => {
    expect(
      [...INTAKE_ORDER].sort(),
      "a field added to the domain and left out of the intake order is collected by nothing, and the previous version of this test compared the order against itself",
    ).toEqual([...FIELD_NAMES].sort())
  })

  it("carries a policy for every field the form intends to collect", () => {
    for (const field of INTAKE_ORDER) {
      expect(
        policyFor(field).criticality,
        `${field} appears on the form with no policy, so nothing decides how it is proved`,
      ).toBeDefined()
    }
  })
})
