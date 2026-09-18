import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FieldName, GateAction, type GateDecision, REASON_CODES, ReasonCode } from "@/domain"
import { GateBanner } from "@/features/gate-banner"
import {
  ACTION_LANGUAGE,
  ALL_REASONS,
  describeReason,
} from "@/features/gate-banner/reason-language"
import { RECOVERY_STEP } from "@/features/gate-banner/recovery-language"

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

describe("the refusal carries its recovery path on the same screen", () => {
  it("names a way forward for every refusal reason code", () => {
    for (const code of REASON_CODES) {
      if (code === ReasonCode.ValidatorPassedHighConf) {
        continue
      }
      expect(
        RECOVERY_STEP[code],
        `${code} refuses a value but names no way forward, leaving the refusal a dead end`,
      ).not.toBeNull()
    }
  })

  it("shows no recovery step beside an accepted value", () => {
    render(<GateBanner decision={decisionWith(ReasonCode.ValidatorPassedHighConf)} />)
    expect(
      screen.queryByText(/The way forward on/),
      "a value that entered the order has nothing left to recover from",
    ).toBeNull()
  })

  it("shows the recovery step in the same banner as the refusal, not a separate element", () => {
    render(<GateBanner decision={decisionWith(ReasonCode.LasaHit)} />)
    const status = screen.getByRole("status")
    expect(
      status.textContent,
      "the refusal and its recovery must be readable inside one landmark, not scattered across the page",
    ).toContain("Answer which of the two names you said")
  })

  it("gives the LASA re-ask its own disambiguation instruction, not a generic confirm", () => {
    render(<GateBanner decision={decisionWith(ReasonCode.LasaHit)} />)
    expect(
      screen.getByText("Answer which of the two names you said"),
      "collapsing the LASA recovery into a plain confirm hides the product's central distinction",
    ).toBeDefined()
  })

  it("tells the caller a pharmacist finishes the field after the attempt budget is spent", () => {
    render(<GateBanner decision={decisionWith(ReasonCode.EscalateAfterThirdFailure)} />)
    expect(
      screen.getByText("A pharmacist finishes this field"),
      "an escalation with no stated next step reads as the agent giving up rather than handing off",
    ).toBeDefined()
  })

  it("names the field inside the recovery label so it reads correctly with multiple cards open", () => {
    render(<GateBanner decision={decisionWith(ReasonCode.LowConfidence)} />)
    expect(screen.getByText("The way forward on Drug name")).toBeDefined()
  })
})
