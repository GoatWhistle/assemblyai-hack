import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { FieldName, GateAction, type GateDecision, ReasonCode } from "@/domain"
import { RefusalCounter } from "@/features/gate-ledger/refusal-counter"
import { REFUSAL_COPY } from "@/features/gate-ledger/refusal-language"
import { RefusalReason, tallyRefusals } from "@/features/gate-ledger/refusal-tally"
import { RejectedTable } from "@/features/gate-ledger/rejected-table"

function decision(
  code: ReasonCode,
  action: GateAction,
  evidence: GateDecision["evidence"] = {},
): GateDecision {
  return {
    action,
    reasonCode: code,
    field: FieldName.DrugName,
    candidateId: `cand-${code}-${action}`,
    agentUtterance: "A phrase the gate handed over.",
    evidence: { threshold: 0.95, ...evidence },
    confirmationMode: null,
  }
}

const accepted = decision(ReasonCode.ValidatorPassedHighConf, GateAction.Accept)
const lowConfidence = decision(ReasonCode.LowConfidence, GateAction.AskConfirm)
const lasaCertain = decision(ReasonCode.LasaHit, GateAction.AskDisambiguate, {
  minConfidence: 1,
})

describe("the refusal headline is a live region, so a screen-reader user hears a re-ask happen", () => {
  it("wraps the three headline counters in an element with an implicit or explicit live announcement", () => {
    const { container } = render(
      <RefusalCounter tally={tallyRefusals([accepted, lowConfidence])} turnsHeld={2} />,
    )
    const headline = container.querySelector("output")
    expect(
      headline,
      "the proposed/confirmed/blocked trio is the exact counter the brief names as silent; without a live-announcing element a screen-reader user only discovers a re-ask by re-reading the page",
    ).not.toBeNull()
    expect(headline?.getAttribute("aria-live")).toBe("polite")
  })

  it("keeps the announcement out of assertive, so a re-ask does not interrupt speech already in progress", () => {
    const { container } = render(
      <RefusalCounter tally={tallyRefusals([accepted, lasaCertain])} turnsHeld={1} />,
    )
    const headline = container.querySelector("output")
    expect(
      headline?.getAttribute("aria-live"),
      "an assertive region on a counter that updates every turn would cut off whatever else the screen reader was mid-sentence on",
    ).not.toBe("assertive")
  })
})

describe("the rejected-values table announces its filtered count", () => {
  const belowThreshold = decision(ReasonCode.LowConfidence, GateAction.AskConfirm)
  const lasaHit = decision(ReasonCode.LasaHit, GateAction.AskDisambiguate, { minConfidence: 1 })

  it("carries a live region stating how many rows are shown out of how many rejected", () => {
    const { container } = render(<RejectedTable decisionHistory={[belowThreshold, lasaHit]} />)
    const live = container.querySelector('[aria-live="polite"]')
    expect(
      live,
      "filtering the table changes the visible row count silently unless some element with aria-live carries that number",
    ).not.toBeNull()
    expect(live?.textContent).toContain("2")
  })

  it("updates the live announcement when a filter narrows the rows", async () => {
    const user = userEvent.setup()
    const { container } = render(<RejectedTable decisionHistory={[belowThreshold, lasaHit]} />)
    await user.click(
      screen.getByRole("button", { name: REFUSAL_COPY[RefusalReason.LasaPair].label }),
    )
    const live = container.querySelector('[aria-live="polite"]')
    expect(
      live,
      "the live region must still exist after filtering, not only on first render",
    ).not.toBeNull()
    expect(
      String(live?.textContent),
      "after filtering to the LASA reason only one row remains, and the live text must say 1 of 2 rather than repeat the unfiltered count",
    ).toContain("1 of 2")
  })
})
