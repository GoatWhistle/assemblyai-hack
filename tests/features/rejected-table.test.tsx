import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { GateAction, ReasonCode } from "@/domain"
import { REFUSAL_COPY } from "@/features/gate-ledger/refusal-language"
import { RefusalReason } from "@/features/gate-ledger/refusal-tally"
import { RejectedTable } from "@/features/gate-ledger/rejected-table"
import { LASA_DECISION } from "@/features/judge-demo/scenario"

const LASA_FILTER_NAME = REFUSAL_COPY[RefusalReason.LasaPair].label

const BELOW_THRESHOLD = {
  ...LASA_DECISION,
  candidateId: "cand-below",
  action: GateAction.AskConfirm,
  reasonCode: ReasonCode.LowConfidence,
  agentUtterance: "Please say the strength again.",
}

describe("RejectedTable", () => {
  it("shows an absence state rather than an empty grid when nothing was rejected", () => {
    render(<RejectedTable decisionHistory={[]} />)
    expect(screen.getByText("Nothing has been rejected yet")).not.toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("lists every rejected decision by default", () => {
    render(<RejectedTable decisionHistory={[BELOW_THRESHOLD, LASA_DECISION]} />)
    const table = screen.getByRole("table")
    expect(within(table).getAllByRole("row")).toHaveLength(3)
  })

  it("filters to the LASA case alone, since that is the case a judge looks for", async () => {
    render(<RejectedTable decisionHistory={[BELOW_THRESHOLD, LASA_DECISION]} />)
    const lasaFilter = screen.getByRole("button", { name: LASA_FILTER_NAME })
    await userEvent.click(lasaFilter)
    const table = screen.getByRole("table")
    expect(within(table).getAllByRole("row")).toHaveLength(2)
    expect(within(table).getByText(LASA_DECISION.agentUtterance)).not.toBeNull()
    expect(within(table).queryByText(BELOW_THRESHOLD.agentUtterance)).toBeNull()
  })

  it("returns to the full list when All reasons is pressed again", async () => {
    render(<RejectedTable decisionHistory={[BELOW_THRESHOLD, LASA_DECISION]} />)
    await userEvent.click(screen.getByRole("button", { name: LASA_FILTER_NAME }))
    await userEvent.click(screen.getByRole("button", { name: /all reasons/i }))
    const table = screen.getByRole("table")
    expect(within(table).getAllByRole("row")).toHaveLength(3)
  })

  it("shows an absence state for a filter that matches nothing, not a silently empty table", async () => {
    render(<RejectedTable decisionHistory={[LASA_DECISION]} />)
    await userEvent.click(
      screen.getByRole("button", { name: /attempts exhausted: spell-out, pharmacist/i }),
    )
    expect(screen.getByText("No rejected value matches this filter")).not.toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("marks the active filter for assistive technology", async () => {
    render(<RejectedTable decisionHistory={[LASA_DECISION]} />)
    const allButton = screen.getByRole("button", { name: /all reasons/i })
    expect(allButton.getAttribute("aria-pressed")).toBe("true")
    const lasaButton = screen.getByRole("button", { name: LASA_FILTER_NAME })
    await userEvent.click(lasaButton)
    expect(lasaButton.getAttribute("aria-pressed")).toBe("true")
    expect(allButton.getAttribute("aria-pressed")).toBe("false")
  })
})
