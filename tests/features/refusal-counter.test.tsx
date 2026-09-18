import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FieldName, GateAction, type GateDecision, REASON_CODES, ReasonCode } from "@/domain"
import { RefusalCounter } from "@/features/gate-ledger/refusal-counter"
import { REFUSAL_COPY } from "@/features/gate-ledger/refusal-language"
import {
  countFor,
  NOTHING_OBSERVED,
  OTHER_REFUSAL_REASONS,
  REASON_OF_CODE,
  RefusalReason,
  THE_THREE_REASONS,
  tallyRefusals,
} from "@/features/gate-ledger/refusal-tally"

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
const checksum = decision(ReasonCode.ValidatorChecksum, GateAction.AskSpellOut)
const catalog = decision(ReasonCode.ValidatorCatalog, GateAction.AskConfirm)
const lasaCertain = decision(ReasonCode.LasaHit, GateAction.AskDisambiguate, {
  minConfidence: 1,
})

describe("the three reasons are counted apart and never merged", () => {
  it("maps every reason code to a refusal reason or to an acceptance", () => {
    for (const code of REASON_CODES) {
      expect(
        code in REASON_OF_CODE,
        `${code} has no bucket, so a new gate branch would silently vanish from the public counter`,
      ).toBe(true)
    }
  })

  it("keeps the three reasons distinct from each other in the table", () => {
    expect(
      new Set(THE_THREE_REASONS).size,
      "collapsing two of the three into one destroys the claim of the product",
    ).toBe(3)
    for (const other of OTHER_REFUSAL_REASONS) {
      expect(
        THE_THREE_REASONS.includes(other),
        `${other} is policy or an exhausted budget, not one of the three reasons to re-ask`,
      ).toBe(false)
    }
  })

  it("files a LASA hit under the pair reason and never under the threshold reason", () => {
    expect(
      REASON_OF_CODE[ReasonCode.LasaHit],
      "a look-alike pair filed as low confidence is exactly the collapse CLAUDE.md forbids",
    ).toBe(RefusalReason.LasaPair)
    expect(REASON_OF_CODE[ReasonCode.LowConfidence]).toBe(RefusalReason.BelowThreshold)
  })

  it("files every validator branch under the validator reason", () => {
    for (const code of [
      ReasonCode.ValidatorChecksum,
      ReasonCode.ValidatorFormat,
      ReasonCode.ValidatorCatalog,
      ReasonCode.ValidatorCombo,
      ReasonCode.NormalizeFailed,
    ]) {
      expect(
        REASON_OF_CODE[code],
        `${code} is a validator refusal; filing it elsewhere understates the validator column`,
      ).toBe(RefusalReason.ValidatorFailed)
    }
  })

  it("counts tool calls, confirmations and blocks over a real decision list", () => {
    const tally = tallyRefusals([accepted, lowConfidence, checksum, catalog, lasaCertain])
    expect(tally.toolCalls, "the denominator is the number of decisions the gate made").toBe(5)
    expect(tally.confirmed, "only an accept writes a value").toBe(1)
    expect(tally.blocked, "every non-accept is a refusal the judge should see").toBe(4)
    expect(countFor(tally, RefusalReason.BelowThreshold)).toBe(1)
    expect(countFor(tally, RefusalReason.ValidatorFailed)).toBe(2)
    expect(countFor(tally, RefusalReason.LasaPair)).toBe(1)
  })

  it("adds the blocked breakdown up to the blocked total", () => {
    const decisions = [accepted, lowConfidence, checksum, catalog, lasaCertain]
    const tally = tallyRefusals(decisions)
    const summed = [...THE_THREE_REASONS, ...OTHER_REFUSAL_REASONS].reduce(
      (total, reason) => total + (countFor(tally, reason) ?? 0),
      0,
    )
    expect(
      summed,
      "a breakdown that does not reconstitute the total is a number without a method",
    ).toBe(tally.blocked)
  })

  it("counts a LASA refusal whose certainty sits at or above the threshold", () => {
    const tally = tallyRefusals([lasaCertain])
    expect(
      tally.lasaNotBelowThreshold,
      "the product exists to refuse at certainty 1.00; if this reads zero the demo claims nothing",
    ).toBe(1)
  })

  it("does not count a low-confidence refusal as a certainty override", () => {
    const tally = tallyRefusals([
      decision(ReasonCode.LowConfidence, GateAction.AskConfirm, { minConfidence: 0.4 }),
    ])
    expect(
      tally.lasaNotBelowThreshold,
      "an override claim over a below-threshold value would be a false claim",
    ).toBe(0)
  })
})

describe("the counter renders for a judge watching a live session", () => {
  it("shows the three reasons by name with their own counts", () => {
    render(
      <RefusalCounter
        tally={tallyRefusals([accepted, lowConfidence, checksum, catalog, lasaCertain])}
        turnsHeld={4}
      />,
    )
    for (const reason of THE_THREE_REASONS) {
      expect(
        screen.getByText(REFUSAL_COPY[reason].label),
        `${reason} must be visible on its own row, not folded into a single blocked number`,
      ).toBeDefined()
    }
  })

  it("carries the denominator and the method beside the figures", () => {
    render(<RefusalCounter tally={tallyRefusals([accepted, lasaCertain])} turnsHeld={2} />)
    expect(
      screen.getByText(/Over 2 caller turns held for this session/),
      "a count over an unnamed denominator is the failure eval/REPORT.md exists to prevent",
    ).toBeDefined()
    expect(screen.getByText(/Counted in this browser/)).toBeDefined()
  })

  it("makes a refusal at high certainty read as correct rather than contradictory", () => {
    render(<RefusalCounter tally={tallyRefusals([lasaCertain])} turnsHeld={1} />)
    expect(
      screen.getByText(/look-alike pair outranks certainty/),
      "high certainty with a mandatory re-ask has to look correct on screen",
    ).toBeDefined()
    expect(screen.getByText(/cannot tell one real drug name from another/)).toBeDefined()
  })

  it("does not claim a certainty override when no LASA hit happened", () => {
    render(<RefusalCounter tally={tallyRefusals([lowConfidence])} turnsHeld={1} />)
    expect(
      screen.queryByText(/look-alike pair outranks certainty/),
      "announcing an override that did not happen is the same dishonesty in the other direction",
    ).toBeNull()
  })

  it("renders nothing decided as absence, not as a clean run", () => {
    render(<RefusalCounter tally={NOTHING_OBSERVED} turnsHeld={null} />)
    expect(
      screen.queryAllByText("0"),
      "a zero here would claim the gate ran and refused nothing",
    ).toHaveLength(0)
    expect(screen.getAllByText(/not observed yet/).length).toBeGreaterThan(0)
  })
})
