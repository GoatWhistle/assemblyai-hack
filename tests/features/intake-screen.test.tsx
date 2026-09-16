import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { GateDecision } from "@/domain"
import { FIELD_LABEL, INTAKE_ORDER } from "@/features/intake/field-language"
import { IntakeScreen } from "@/features/intake/intake-screen"
import {
  DISCLAIMER,
  FAULT_COPY,
  PHASE_LABEL,
  SessionFault,
  SessionPhase,
} from "@/features/intake/session-status"
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
  it("states the product claim in the masthead", () => {
    renderScreen()
    expect(screen.getByText("Readback")).toBeDefined()
    expect(screen.getByText(/proves it did not mishear/i)).toBeDefined()
  })

  it("carries the medical disclaimer, honestly worded", () => {
    renderScreen()
    expect(screen.getByText(DISCLAIMER.title)).toBeDefined()
    expect(screen.getByText(/Synthetic data only/)).toBeDefined()
    expect(screen.getByText(/No real patients, no real prescriptions/)).toBeDefined()
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

  it("explains the three re-ask reasons before anything has been proposed", () => {
    renderScreen({ candidates: [], decisions: new Map() })
    expect(screen.getByText(/three reasons the agent asks again/i)).toBeDefined()
    expect(screen.getByText("E_LASA_HIT")).toBeDefined()
    expect(
      screen.getByText(/even at certainty 1\.00/i),
      "the claim that outranks confidence has to be stated up front",
    ).toBeDefined()
  })

  it("reports how many echo turns were discarded", () => {
    renderScreen({ echoDiscards: 3 })
    expect(screen.getByText("3 echo turns discarded")).toBeDefined()
  })

  it("links to the demonstration and the measurements", () => {
    renderScreen()
    expect(screen.getByRole("link", { name: /Recorded demonstration/i })).toBeDefined()
    expect(screen.getByRole("link", { name: /Measurements/i })).toBeDefined()
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

describe("honest status surfaces", () => {
  for (const fault of Object.values(SessionFault)) {
    it(`explains the ${fault} fault with a remedy`, () => {
      const { unmount } = renderScreen({ fault, phase: SessionPhase.Blocked })
      expect(screen.getByRole("alert")).toBeDefined()
      expect(screen.getByText(FAULT_COPY[fault].title)).toBeDefined()
      expect(screen.getByText(FAULT_COPY[fault].remedy)).toBeDefined()
      unmount()
    })
  }

  it("offers the recorded demonstration as the way past a blocked microphone", () => {
    renderScreen({ fault: SessionFault.MicrophoneDenied, phase: SessionPhase.Blocked })
    expect(
      screen.getByRole("button", { name: /Open the recorded demonstration/i }),
    ).toBeDefined()
  })

  it("explains that a token is single-use when a socket drops", () => {
    expect(FAULT_COPY.socket_dropped.body).toContain("single-use")
  })

  it("explains that both sockets bill at once when credit runs out", () => {
    expect(FAULT_COPY.credits_exhausted.body).toContain("socket lifetime")
  })
})

describe("field language", () => {
  it("labels every field in the policy table", () => {
    for (const field of INTAKE_ORDER) {
      expect(FIELD_LABEL[field].length).toBeGreaterThan(0)
    }
    expect(INTAKE_ORDER.length).toBe(11)
  })
})
