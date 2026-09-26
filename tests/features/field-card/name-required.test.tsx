import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type ConfirmationEvidence, ConfirmationReason } from "@/domain"
import {
  ConfirmationStatus,
  confirmationStatusOf,
} from "@/features/confirmation/confirmation-status"
import { FieldCard } from "@/features/field-card"
import { nameAnswerState } from "@/features/field-card/field-status"
import { GateBanner } from "@/features/gate-banner"
import { JudgeDemo } from "@/features/judge-demo"
import { DECISION_AT_MS, SETTLED_AT_MS } from "@/features/judge-demo/demo-arms"
import { LASA_CANDIDATE, LASA_DECISION } from "@/features/judge-demo/scenario"

function wholeParagraph(text: string) {
  return (_: string, element: Element | null) =>
    element?.tagName === "P" && element.textContent === text
}

function evidence(
  verdict: ConfirmationEvidence["verdict"],
  reasonCode: ConfirmationReason,
): ConfirmationEvidence {
  return {
    field: LASA_CANDIDATE.field,
    candidateId: LASA_CANDIDATE.candidateId,
    readBack: null,
    callerTurn: null,
    verdict,
    reasonCode,
    callerAnswerHint: null,
  }
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("S0: a LASA field card says it needs the name, not a yes", () => {
  it("says so while the answer is pending", () => {
    render(<FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} />)
    expect(screen.getByText("Needs the name, not a yes")).toBeTruthy()
    expect(screen.getByText(/A yes does not confirm this field/)).toBeTruthy()
  })

  it("says the yes was refused when the server answered E_LASA_NAMED_ANSWER_REQUIRED", () => {
    const refused = evidence("unclear", ConfirmationReason.LasaNamedAnswerRequired)
    expect(nameAnswerState(refused)).toBe("yes-refused")
    expect(confirmationStatusOf(refused)).toBe(ConfirmationStatus.NameRequired)
    render(<FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} evidence={refused} />)
    expect(screen.getByText("Needs the name, not a yes")).toBeTruthy()
    expect(screen.getAllByText(/E_LASA_NAMED_ANSWER_REQUIRED/).length).toBeGreaterThan(0)
  })

  it("stops asking for the name once one was said, and reads a named partner as a correction", () => {
    const corrected = evidence("rejected", ConfirmationReason.CallerNamedPartner)
    expect(nameAnswerState(corrected)).toBe("named")
    expect(confirmationStatusOf(corrected)).toBe(ConfirmationStatus.Corrected)
    render(
      <FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} evidence={corrected} />,
    )
    expect(screen.queryByText("Needs the name, not a yes")).toBeNull()
    expect(screen.getByText("Settled by a spoken name")).toBeTruthy()
  })
})

describe("S0: the RE-ASK banner puts both candidates as the question", () => {
  it("shows the two names joined by or, and says a yes is not an answer", () => {
    render(<GateBanner decision={LASA_DECISION} candidate={LASA_CANDIDATE} />)
    expect(screen.getByText(wholeParagraph("Hydromorphone or Morphine?"))).toBeTruthy()
    expect(screen.getByText(/A yes is not an answer to it/)).toBeTruthy()
  })

  it("shows no contrastive question for a decision that is not a pair hit", () => {
    render(
      <GateBanner
        decision={{ ...LASA_DECISION, reasonCode: "E_READ_BACK_REQUIRED" }}
        candidate={LASA_CANDIDATE}
      />,
    )
    expect(screen.queryByText(/A yes is not an answer to it/)).toBeNull()
  })
})

describe("S0: the replay's product path carries the name requirement through to the answer", () => {
  it("asks for the name at the decision and settles on it after the caller names the drug", () => {
    vi.useFakeTimers()
    render(<JudgeDemo />)
    fireEvent.click(screen.getByRole("button", { name: /play the replay/i }))
    act(() => {
      vi.advanceTimersByTime(DECISION_AT_MS + 100)
    })
    const before = screen.queryAllByText("Settled by a spoken name").length
    expect(before).toBe(0)
    expect(
      screen.getAllByText(wholeParagraph("Hydromorphone or Morphine?")).length,
    ).toBeGreaterThan(0)
    act(() => {
      vi.advanceTimersByTime(SETTLED_AT_MS - DECISION_AT_MS)
    })
    expect(screen.getByText("Settled by a spoken name")).toBeTruthy()
    expect(screen.getAllByText(ConfirmationReason.CallerNamedPartner).length).toBeGreaterThan(0)
  })
})
