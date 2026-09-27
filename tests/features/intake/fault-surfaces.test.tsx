import { render, screen, within } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import type { GateDecision } from "@/domain"
import { FAULT_STEPS } from "@/features/intake/fault-steps"
import { preloadInCall } from "@/features/intake/in-call-loader"
import { IntakeScreen } from "@/features/intake/intake-screen"
import { RETRY_ACTION_LABEL } from "@/features/intake/intake-screen/fault-panel"
import { FAULT_COPY, SessionFault, SessionPhase } from "@/features/intake/session-status"
import {
  LASA_CANDIDATE,
  LASA_DECISION,
  NAME_CANDIDATE,
  NAME_DECISION,
} from "@/features/judge-demo/scenario"
import { initialContext } from "@/features/read-back/read-back-machine"
import { callerEntry } from "@/features/transcript-view/transcript-entry"

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

describe("honest status surfaces", () => {
  for (const fault of Object.values(SessionFault)) {
    it(`explains the ${fault} fault with a remedy`, () => {
      const { unmount } = renderScreen({ fault, phase: SessionPhase.Blocked })
      expect(screen.getByRole("alert")).toBeDefined()
      const card = screen.getByRole("alert")
      expect(within(card).getByRole("heading", { name: FAULT_COPY[fault].title })).toBeDefined()
      for (const step of FAULT_STEPS[fault].steps) {
        expect(within(card).getByText(step)).toBeDefined()
      }
      unmount()
    })
  }

  it("offers one retry and no replay action on a refused microphone, focused on its title", () => {
    renderScreen({
      candidates: [],
      decisions: new Map(),
      transcript: [],
      fault: SessionFault.MicrophoneDenied,
      phase: SessionPhase.Blocked,
    })
    const card = screen.getByRole("alert")
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(within(card).getByRole("button", { name: RETRY_ACTION_LABEL })).toBeDefined()
    expect(
      within(card).queryByRole("link", { name: /replay/i }),
      "the fault card offers the retry only",
    ).toBeNull()
    expect(document.activeElement).toBe(
      within(card).getByRole("heading", { name: FAULT_COPY.microphone_denied.title }),
    )
  })

  it("keeps the fault card out of the header", () => {
    renderScreen({
      candidates: [],
      decisions: new Map(),
      transcript: [],
      fault: SessionFault.MicrophoneDenied,
      phase: SessionPhase.Blocked,
    })
    expect(screen.getByRole("banner").textContent).not.toMatch(/blocked|could not start/i)
  })

  it("keeps the recovery actions beside the microphone once a fault has to be read", () => {
    const { unmount } = renderScreen({
      candidates: [],
      decisions: new Map(),
      transcript: [],
    })
    expect(
      screen.getByRole("region", { name: "What to say" }),
      "the idle hero pairs the microphone with what to say into it",
    ).toBeDefined()
    unmount()

    renderScreen({
      candidates: [],
      decisions: new Map(),
      transcript: [],
      fault: SessionFault.MicrophoneDenied,
      phase: SessionPhase.Blocked,
    })
    expect(
      screen.queryByRole("region", { name: "What to say" }),
      "dictation examples beside a refused microphone compete with the only actions that help",
    ).toBeNull()
    expect(
      document.querySelector('[class*="stage"]'),
      "measured at 1440x900 the recovery actions sat at y=1084 under a viewport-tall stage and y=772 without it",
    ).toBeNull()
  })

  it("explains that a token is single-use when a socket drops", () => {
    expect(FAULT_COPY.socket_dropped.body).toContain("single-use")
  })

  it("explains that both sockets bill at once when credit runs out", () => {
    expect(FAULT_COPY.credits_exhausted.body).toContain("socket lifetime")
  })
})
