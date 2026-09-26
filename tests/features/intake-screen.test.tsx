import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"
import type { GateDecision } from "@/domain"
import { preloadInCall } from "@/features/intake/in-call-loader"
import { IntakeScreen, LEGAL_SUMMARY } from "@/features/intake/intake-screen"
import {
  CALL_EXAMPLES,
  INTAKE_HINT,
  JUDGE_LINK_LABEL,
} from "@/features/intake/intake-screen/intake-prompt"
import { THESIS_PROMISE } from "@/features/intake/intake-screen/thesis"
import { PHASE_LABEL, SessionPhase } from "@/features/intake/session-status"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import {
  LASA_CANDIDATE,
  LASA_DECISION,
  NAME_CANDIDATE,
  NAME_DECISION,
} from "@/features/judge-demo/scenario"
import { initialContext } from "@/features/read-back/read-back-machine"
import { callerEntry } from "@/features/transcript-view/transcript-entry"
import { DISCLAIMER_TITLE } from "@/shared/ui/states/disclaimer"

beforeAll(async () => {
  await preloadInCall()
})

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
      screen.getByText(THESIS_PROMISE),
      "the product's whole argument is that certainty is not proof, so the screen has to say it before it says anything else",
    ).toBeDefined()
    expect(THESIS_PROMISE).toMatch(
      /look-alike list is asked again, even when the recognizer is certain/i,
    )
    expect(THESIS_PROMISE).toMatch(/read back to you before they are written/i)
    expect(THESIS_PROMISE, "NPI and DEA carry readBackAlways false").toMatch(
      /NPI or DEA number is checked by arithmetic/,
    )
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
    expect(screen.getByText(DISCLAIMER_TITLE)).toBeDefined()
    expect(screen.getByText(/Synthetic data only/)).toBeDefined()
    expect(screen.getByText(/No real patients, no real prescriptions/)).toBeDefined()
  })

  it("carries the disclaimer before a call has started too", () => {
    renderScreen({ candidates: [], decisions: new Map(), transcript: [] })
    expect(
      screen.getByText(DISCLAIMER_TITLE),
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
    expect(
      trigger.getAttribute("aria-pressed"),
      "a toggle that changes its label and its pressed state at once announces the state twice (r1-A2 F18)",
    ).toBeNull()
    expect(trigger.getAttribute("aria-keyshortcuts")).toBe("Space")
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
    expect(screen.getByText(INTAKE_HINT)).toBeDefined()
    expect(
      INTAKE_HINT,
      "'sig' is pharmacy jargon an ordinary caller does not know (r1-A1 A1-03)",
    ).not.toMatch(/\bsig\b/i)
    const judge = screen.getByRole("link", { name: JUDGE_LINK_LABEL })
    expect(
      judge.getAttribute("href"),
      "a judge who opens the user page still needs one visible step to the replay",
    ).toBe(REPLAY_ENTRY_HREF)
    for (const line of CALL_EXAMPLES) {
      expect(screen.getByText(`“${line}”`)).toBeDefined()
    }
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

  it("links to the call, the replay and the documentation exactly once each", () => {
    renderScreen()
    expect(screen.getAllByRole("link", { name: /^Call$/i })).toHaveLength(1)
    expect(screen.getAllByRole("link", { name: /^Replay$/i })).toHaveLength(1)
    expect(screen.getAllByRole("link", { name: /^Docs$/i })).toHaveLength(1)
  })

  it("keeps the telemetry present but folded behind Technical details", () => {
    renderScreen({ telemetry: <p>telemetry body</p> })
    const details = screen.getByText("Technical details").closest("details")
    expect(details, "the telemetry must stay on the page, one click away").not.toBeNull()
    expect(details?.open, "an ordinary caller should not face socket frames first").toBe(false)
    expect(details?.textContent).toContain("telemetry body")
  })

  it("shows the disclaimer's substance in one line and keeps the full text one click away", () => {
    renderScreen({ candidates: [], decisions: new Map(), transcript: [] })
    expect(screen.getByText(LEGAL_SUMMARY)).toBeDefined()
    expect(LEGAL_SUMMARY).toMatch(/not a medical device/i)
    expect(LEGAL_SUMMARY).toMatch(/never a real patient/i)
    const details = screen.getByText(LEGAL_SUMMARY).closest("details")
    expect(details?.textContent).toContain(DISCLAIMER_TITLE)
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
