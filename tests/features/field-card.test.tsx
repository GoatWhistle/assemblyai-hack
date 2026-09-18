import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { GateAction, policyFor, ReasonCode, VerdictOutcome } from "@/domain"
import { FieldCard } from "@/features/field-card"
import {
  isConfidenceOverruled,
  STANCE_LABEL,
  stanceOf,
} from "@/features/field-card/field-status"
import {
  LASA_CANDIDATE,
  LASA_DECISION,
  NAME_CANDIDATE,
  NAME_DECISION,
  QUANTITY_CANDIDATE,
  QUANTITY_DECISION,
} from "@/features/judge-demo/scenario"

describe("the LASA hit at high confidence", () => {
  it("shows a certainty at or above the threshold and still a mandatory re-ask", () => {
    const policy = policyFor(LASA_CANDIDATE.field)
    expect(LASA_CANDIDATE.provenance.minConfidence).toBeGreaterThanOrEqual(
      policy.autoAcceptThreshold,
    )
    expect(LASA_DECISION.action).toBe(GateAction.AskDisambiguate)
    render(<FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} />)
    expect(
      screen.getByText(STANCE_LABEL.lasa),
      "the chip names the action asked of the caller, and the re-ask still fires above the threshold",
    ).toBeDefined()
  })

  it("states in words that certainty does not settle which name was spoken", () => {
    render(<FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} />)
    expect(
      screen.getByText(/Needs confirming, whatever the certainty says/i),
      "the heading has to name the ask; a heading about confidence alone reads as an argument with the recognizer",
    ).toBeDefined()
    expect(
      screen.getByText(/does not settle which name was spoken/i),
      "the reason is that no number distinguishes two members of a pair, which is a statement about the signal rather than about the caller",
    ).toBeDefined()
  })

  it("marks the certainty reading as outranked rather than contradicting it", () => {
    render(<FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} />)
    expect(
      screen.getByText(/Outranked on this field by a published look-alike pair/i),
    ).toBeDefined()
    expect(isConfidenceOverruled(LASA_DECISION)).toBe(true)
  })

  it("names both alternatives from the published list", () => {
    render(<FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} />)
    expect(screen.getAllByText(String(LASA_CANDIDATE.lasa.matchedTerm)).length).toBeGreaterThan(
      0,
    )
    for (const partner of LASA_CANDIDATE.lasa.confusableWith) {
      expect(screen.getByText(partner)).toBeDefined()
    }
    expect(screen.getByText("confusable with")).toBeDefined()
  })

  it("cites the source row rather than merely asserting the pair", () => {
    render(<FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} />)
    const row = String(LASA_CANDIDATE.lasa.sourceRow)
    expect(
      screen.getByText((_, node) => node?.textContent?.includes(row) === true, {
        selector: "p",
      }),
      "the row on screen must be the row the curated table carries, not prose about it",
    ).toBeDefined()
    expect(row).toContain("ISMP")
  })

  it("puts proof above certainty in the reading order it states", () => {
    render(<FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} />)
    expect(screen.getByText(/the published pair decides/i)).toBeDefined()
  })
})

describe("confidence is never presented as a score", () => {
  it("attributes the number to the recognizer itself", () => {
    render(<FieldCard candidate={QUANTITY_CANDIDATE} decision={QUANTITY_DECISION} />)
    expect(screen.getByText(/Recognizer said, of itself/i)).toBeDefined()
  })

  it("never renders the certainty as a percentage", () => {
    const { container } = render(<FieldCard candidate={QUANTITY_CANDIDATE} decision={null} />)
    expect(container.textContent).not.toMatch(/9[0-9]\s*%/)
    expect(container.textContent).not.toMatch(/quality/i)
    expect(container.textContent).not.toMatch(/score/i)
  })

  it("states what the number cannot prove", () => {
    render(<FieldCard candidate={QUANTITY_CANDIDATE} decision={null} />)
    expect(
      screen.getByText(/cannot tell one real word from another that sounds like it/i),
    ).toBeDefined()
  })

  it("shows the threshold as a reading on the track rather than a pass mark", () => {
    render(<FieldCard candidate={QUANTITY_CANDIDATE} decision={null} />)
    expect(screen.getByText(/field threshold 0.92 marked on the track/i)).toBeDefined()
  })

  it("labels the two columns so proof and self-report are not confused", () => {
    render(<FieldCard candidate={QUANTITY_CANDIDATE} decision={QUANTITY_DECISION} />)
    expect(screen.getByText("What proves this value")).toBeDefined()
    expect(screen.getByText("What the recognizer claims about itself")).toBeDefined()
  })
})

describe("the field with no validator", () => {
  it("says so plainly rather than dressing it as a pass", () => {
    expect(NAME_CANDIDATE.verdict.outcome).toBe(VerdictOutcome.NotApplicable)
    render(<FieldCard candidate={NAME_CANDIDATE} decision={NAME_DECISION} />)
    expect(screen.getByText("No validator exists for this field")).toBeDefined()
    expect(screen.getAllByText(/voice confirmation is the only proof/i).length).toBeGreaterThan(
      0,
    )
  })

  it("carries readBackAlways for every field whose validator is none", () => {
    expect(policyFor(NAME_CANDIDATE.field).validator).toBe("none")
    expect(policyFor(NAME_CANDIDATE.field).readBackAlways).toBe(true)
  })
})

describe("provenance on the card", () => {
  it("shows each source word with its millisecond span and certainty", () => {
    render(<FieldCard candidate={QUANTITY_CANDIDATE} decision={null} />)
    expect(screen.getByText(/8340-8640 ms/)).toBeDefined()
    expect(screen.getByText(/span 8340-9080 ms/)).toBeDefined()
  })

  it("states that provenance is a browser computation", () => {
    render(<FieldCard candidate={QUANTITY_CANDIDATE} decision={null} />)
    expect(screen.getByText(/computed in the browser/i)).toBeDefined()
    expect(screen.getByText(/client-supplied/i)).toBeDefined()
  })

  it("reports the selected word back to the caller so the transcript can follow", async () => {
    const onSelectWord = vi.fn()
    render(
      <FieldCard candidate={QUANTITY_CANDIDATE} decision={null} onSelectWord={onSelectWord} />,
    )
    await userEvent.click(screen.getByRole("button", { name: /thirty/i }))
    expect(onSelectWord).toHaveBeenCalledOnce()
    expect(onSelectWord.mock.calls[0]?.[0]).toMatchObject({ text: "thirty", startMs: 8340 })
  })

  it("marks the selected word as pressed for assistive technology", () => {
    render(
      <FieldCard candidate={QUANTITY_CANDIDATE} decision={null} selectedWordStartMs={8340} />,
    )
    expect(screen.getByRole("button", { name: /thirty/i }).getAttribute("aria-pressed")).toBe(
      "true",
    )
  })
})

describe("the validator verdict", () => {
  it("cites the rule rather than only the outcome", () => {
    render(<FieldCard candidate={QUANTITY_CANDIDATE} decision={QUANTITY_DECISION} />)
    expect(screen.getByText(/integer within the documented bounds/i)).toBeDefined()
  })

  it("says the catalogue proves a drug name, not a checksum", () => {
    render(<FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} />)
    expect(screen.getByText(/There is no check digit here/i)).toBeDefined()
  })
})

describe("stanceOf", () => {
  it("places the lasa branch above accept even when the action would otherwise pass", () => {
    expect(stanceOf(LASA_CANDIDATE, LASA_DECISION)).toBe("lasa")
  })

  it("reads accept as being in the order", () => {
    expect(
      stanceOf(QUANTITY_CANDIDATE, {
        ...QUANTITY_DECISION,
        action: GateAction.Accept,
        reasonCode: ReasonCode.ValidatorPassedHighConf,
      }),
    ).toBe("accepted")
  })

  it("reads escalation and abort as their own stances", () => {
    expect(
      stanceOf(QUANTITY_CANDIDATE, {
        ...QUANTITY_DECISION,
        action: GateAction.EscalateHuman,
        reasonCode: ReasonCode.EscalateAfterThirdFailure,
      }),
    ).toBe("escalated")
    expect(
      stanceOf(QUANTITY_CANDIDATE, {
        ...QUANTITY_DECISION,
        action: GateAction.AbortField,
        reasonCode: ReasonCode.AbortNonCritical,
      }),
    ).toBe("aborted")
  })

  it("reads an undecided candidate as proposed", () => {
    expect(stanceOf(QUANTITY_CANDIDATE, null)).toBe("asking")
  })
})
