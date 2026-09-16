import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FieldName, GateAction, type GateDecision, REASON_CODES, ReasonCode } from "@/domain"
import { GateBanner } from "@/features/gate-banner"
import {
  ACTION_LANGUAGE,
  ALL_REASONS,
  describeReason,
} from "@/features/gate-banner/reason-language"

function decisionWith(code: ReasonCode): GateDecision {
  return {
    action: GateAction.AskConfirm,
    reasonCode: code,
    field: FieldName.DrugName,
    candidateId: "cand-1",
    agentUtterance: "A phrase the gate handed over.",
    evidence: { threshold: 0.95 },
    confirmationMode: null,
  }
}

describe("reason language coverage", () => {
  it("describes every one of the thirteen reason codes", () => {
    expect(REASON_CODES.length).toBe(13)
    expect(ALL_REASONS.length).toBe(13)
    for (const code of REASON_CODES) {
      const described = describeReason(code)
      expect(described.headline.length).toBeGreaterThan(0)
      expect(described.because.length).toBeGreaterThan(0)
    }
  })

  it("names every gate action in human words", () => {
    for (const action of Object.values(GateAction)) {
      expect(ACTION_LANGUAGE[action].length).toBeGreaterThan(0)
    }
  })

  it("explains the LASA branch as independent of confidence", () => {
    expect(describeReason(ReasonCode.LasaHit).because).toContain("regardless of confidence")
  })

  it("says the no-validator branch offers voice as the only proof", () => {
    expect(describeReason(ReasonCode.NoValidator).because).toContain("only proof")
  })

  it("explains that the minimum confidence is used rather than the mean", () => {
    expect(describeReason(ReasonCode.LowConfidence).because).toContain("mean")
  })
})

describe("GateBanner", () => {
  for (const code of REASON_CODES) {
    it(`renders the reason code ${code} with its headline and the phrase the agent says`, () => {
      const { unmount } = render(<GateBanner decision={decisionWith(code)} />)
      expect(screen.getByText(code)).toBeDefined()
      expect(screen.getByText(describeReason(code).headline)).toBeDefined()
      expect(screen.getByText("A phrase the gate handed over.")).toBeDefined()
      unmount()
    })
  }

  it("announces itself politely so a decision is not missed by a screen reader", () => {
    render(<GateBanner decision={decisionWith(ReasonCode.LasaHit)} />)
    const status = screen.getByRole("status")
    expect(status.getAttribute("aria-live")).toBe("polite")
  })

  it("has a designed idle state rather than rendering nothing", () => {
    render(<GateBanner decision={null} />)
    expect(screen.getByText(/has not been asked anything yet/i)).toBeDefined()
  })

  it("labels the field the decision was about", () => {
    render(<GateBanner decision={decisionWith(ReasonCode.ValidatorCatalog)} />)
    expect(screen.getByText("Drug name")).toBeDefined()
  })
})
