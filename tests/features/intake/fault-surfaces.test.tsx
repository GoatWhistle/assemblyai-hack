import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { GateDecision } from "@/domain"
import { IntakeScreen } from "@/features/intake/intake-screen"
import { FAULT_COPY, SessionFault, SessionPhase } from "@/features/intake/session-status"
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
    expect(screen.getByRole("link", { name: /watch the recording instead/i })).toBeDefined()
  })

  it("drops the viewport-tall idle stage once a fault has to be read", () => {
    const { container, unmount } = renderScreen({
      candidates: [],
      decisions: new Map(),
      transcript: [],
    })
    const idleStage = container.querySelector('[class*="stage"]')
    expect(
      idleStage,
      "the idle screen centres the microphone in the viewport on purpose",
    ).not.toBeNull()
    unmount()

    renderScreen({
      candidates: [],
      decisions: new Map(),
      transcript: [],
      fault: SessionFault.MicrophoneDenied,
      phase: SessionPhase.Blocked,
    })
    expect(
      screen.getByRole("alert").parentElement?.querySelector('[class*="stage"]'),
      "a viewport-tall stage above the fault pushes the recovery actions below the fold, which is where a judge without a microphone stops",
    ).toBeNull()
    expect(
      document.querySelector('[class*="stage"]'),
      "measured at 1440x900 the recovery actions sat at y=1084 with the stage and y=772 without it",
    ).toBeNull()
  })

  it("explains that a token is single-use when a socket drops", () => {
    expect(FAULT_COPY.socket_dropped.body).toContain("single-use")
  })

  it("explains that both sockets bill at once when credit runs out", () => {
    expect(FAULT_COPY.credits_exhausted.body).toContain("socket lifetime")
  })
})
