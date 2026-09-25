import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { GateAction, type GateDecision, policyFor, ReasonCode } from "@/domain"
import { ACCUSATION_WORDS } from "@/features/gate-banner/hypothesis-language"
import { PROBE_GROUP_LABEL, ScenarioPicker } from "@/features/judge-demo/scenario-picker"
import { FLUENT_WORDS } from "@/features/judge-demo/scenario-picker/probe-candidates"
import { PROBES, ProbeId, probeFor } from "@/features/judge-demo/scenario-picker/scenarios"
import {
  NO_FALLBACK_NOTE,
  SERVER_FAILED_TITLE,
} from "@/features/judge-demo/scenario-picker/server-probe"
import {
  DEMO_RUN_PATH,
  type DemoRunResult,
} from "@/features/judge-demo/scenario-picker/server-run"
import { decide } from "@/gate"

const SERVER_DECISION: GateDecision = {
  action: GateAction.AskWhichPart,
  reasonCode: ReasonCode.ValidatorCombo,
  field: "drug_name",
  candidateId: "demo-unsupported",
  agentUtterance:
    "I have warfarin written down, but what I heard was lisinopril. Which part should I change?",
  evidence: {
    spokenText: "lisinopril ten milligrams",
    proposedTokens: "warfarin",
    unsupportedTokens: "warfarin",
  },
  confirmationMode: null,
}

const SERVER_RESULT: DemoRunResult = {
  scenario: ProbeId.UnsupportedValue,
  description: "the model proposes warfarin while the caller said lisinopril",
  spoken: "lisinopril ten milligrams",
  proposedValue: "warfarin",
  decision: SERVER_DECISION,
  reasonCode: ReasonCode.ValidatorCombo,
  sayToCaller: SERVER_DECISION.agentUtterance,
  writtenToOrder: false,
}

function answering(status: number, body: unknown) {
  return vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }),
  )
}

function browserDecision(id: ProbeId): GateDecision {
  const probe = probeFor(id)
  if (probe.runsOn !== "browser") {
    throw new Error(`${id} is not decided in the browser`)
  }
  expect(probe.decision).toEqual(decide(probe.candidate, policyFor(probe.candidate.field)))
  return probe.decision
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the three adversarial scenarios", () => {
  it("unknown_value re-asks with E_VALIDATOR_CATALOG and offers no substitute", () => {
    const decision = browserDecision(ProbeId.UnknownValue)
    expect(decision.reasonCode).toBe(ReasonCode.ValidatorCatalog)
    expect(decision.action).not.toBe(GateAction.Accept)
    expect(decision.agentUtterance).not.toMatch(/closest name|did you mean/i)
  })

  it("fluent_wrong_partner re-asks with E_LASA_HIT at certainty 1.00 over a turn with no pause", () => {
    const probe = probeFor(ProbeId.FluentWrongPartner)
    const decision = browserDecision(ProbeId.FluentWrongPartner)
    expect(decision.reasonCode).toBe(ReasonCode.LasaHit)
    expect(probe.runsOn === "browser" && probe.candidate.provenance.minConfidence).toBe(1)
    for (const [index, word] of FLUENT_WORDS.entries()) {
      expect(word.confidence).toBe(1)
      const next = FLUENT_WORDS[index + 1]
      if (next !== undefined) {
        expect(next.startMs, "a gap would give a hesitation detector something to use").toBe(
          word.endMs,
        )
      }
    }
  })

  it("unsupported_value is not decided in the browser, because the reconciliation lives on the server", () => {
    expect(probeFor(ProbeId.UnsupportedValue).runsOn).toBe("server")
  })

  it("carries no accusing word in any probe wording", () => {
    for (const probe of PROBES) {
      for (const text of [probe.label, probe.headerNote, probe.whyThisOne]) {
        for (const word of ACCUSATION_WORDS) {
          expect(text.toLowerCase()).not.toContain(word)
        }
      }
    }
  })
})

describe("the server-run scenario", () => {
  it("posts the scenario id to the demo route and shows the server's E_VALIDATOR_COMBO verdict", async () => {
    const fetchSpy = answering(200, SERVER_RESULT)
    vi.stubGlobal("fetch", fetchSpy)
    render(<ScenarioPicker />)
    const group = screen.getByRole("group", { name: PROBE_GROUP_LABEL })
    await userEvent.click(within(group).getByRole("button", { name: /a value nobody said/i }))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe(DEMO_RUN_PATH)
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toEqual({ scenario: ProbeId.UnsupportedValue })
    await waitFor(() => {
      expect(screen.getAllByText(ReasonCode.ValidatorCombo).length).toBeGreaterThan(0)
    })
    expect(screen.getByText("lisinopril ten milligrams")).toBeDefined()
  })

  it("shows an explicit error with the status on a 500 and no verdict", async () => {
    vi.stubGlobal("fetch", answering(500, { error: "boom" }))
    render(<ScenarioPicker />)
    await userEvent.click(screen.getByRole("button", { name: /a value nobody said/i }))
    await waitFor(() => {
      expect(screen.getByText(SERVER_FAILED_TITLE)).toBeDefined()
    })
    expect(screen.getAllByText(/HTTP 500/).length).toBeGreaterThan(0)
    expect(screen.getByText(new RegExp(NO_FALLBACK_NOTE.slice(0, 30)))).toBeDefined()
    expect(screen.queryByText(ReasonCode.ValidatorCombo)).toBeNull()
    expect(screen.queryByText(/The phrase the gate handed the agent to say/)).toBeNull()
  })

  it("refuses a body that is not a result for the requested scenario", async () => {
    vi.stubGlobal("fetch", answering(200, { ...SERVER_RESULT, scenario: "unknown_value" }))
    render(<ScenarioPicker />)
    await userEvent.click(screen.getByRole("button", { name: /a value nobody said/i }))
    await waitFor(() => {
      expect(screen.getByText(SERVER_FAILED_TITLE)).toBeDefined()
    })
    expect(screen.queryByText(ReasonCode.ValidatorCombo)).toBeNull()
  })

  it("never calls the server for a scenario decided in the page", async () => {
    const fetchSpy = answering(200, SERVER_RESULT)
    vi.stubGlobal("fetch", fetchSpy)
    render(<ScenarioPicker />)
    await userEvent.click(screen.getByRole("button", { name: /catalogue does not hold/i }))
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.getAllByText(ReasonCode.ValidatorCatalog).length).toBeGreaterThan(0)
  })
})
