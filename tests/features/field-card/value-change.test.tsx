import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { FieldCandidate } from "@/domain"
import { FieldCard } from "@/features/field-card"
import { priorAttemptOf, valueChanged } from "@/features/field-card/prior-attempt"
import { CHANGED_NOTE, UNCHANGED_NOTE } from "@/features/field-card/value-change"
import { LASA_CANDIDATE, LASA_DECISION } from "@/features/judge-demo/scenario"

function attemptOf(attempt: number, rawValue: string, normalizedValue: string): FieldCandidate {
  return {
    ...LASA_CANDIDATE,
    candidateId: `cand-attempt-${attempt}`,
    attempt,
    rawValue,
    normalizedValue,
  }
}

const first = attemptOf(1, "bisoprolol", "bisoprolol")
const second = attemptOf(2, "lisinopril", "lisinopril")
const repeat = attemptOf(2, "bisoprolol", "bisoprolol")

describe("the previous attempt on a field is found without guessing at ordering", () => {
  it("returns nothing when the field has only ever been proposed once", () => {
    expect(
      priorAttemptOf(first, [first]),
      "a first attempt has nothing to compare against, and inventing a before state would fabricate history",
    ).toBeNull()
  })

  it("picks the highest earlier attempt rather than the first one in the list", () => {
    const third = attemptOf(3, "lisinopril", "lisinopril")
    const prior = priorAttemptOf(third, [third, first, second])
    expect(
      prior?.attempt,
      "the panel must show what the field held immediately before, not the oldest value anyone ever said",
    ).toBe(2)
  })

  it("ignores candidates belonging to another field", () => {
    const other: FieldCandidate = { ...first, candidateId: "other-field", attempt: 1 }
    const mismatched = { ...other, field: "patientName" } as unknown as FieldCandidate
    expect(
      priorAttemptOf(second, [second, mismatched]),
      "a previous value from a different field would show the drug name being replaced by a patient name",
    ).toBeNull()
  })

  it("ignores a later or equal attempt, which is not a before state", () => {
    expect(
      priorAttemptOf(first, [first, second]),
      "attempt 2 came after attempt 1, so presenting it as the previous value reverses the history it claims to show",
    ).toBeNull()
  })

  it("tells a changed value apart from a value the re-ask repeated", () => {
    const priorForChange = priorAttemptOf(second, [first, second])
    expect(priorForChange, "the fixture must produce a prior attempt").not.toBeNull()
    expect(
      priorForChange === null ? null : valueChanged(priorForChange, second),
      "a different value means the field is about to be overwritten, which is the case the panel exists for",
    ).toBe(true)
    const priorForRepeat = priorAttemptOf(repeat, [first, repeat])
    expect(
      priorForRepeat === null ? null : valueChanged(priorForRepeat, repeat),
      "a repeated value is corroboration rather than a correction, and labelling it a change would misread the read-back",
    ).toBe(false)
  })
})

describe("nothing is written until the gate passes, and the panel says so", () => {
  it("shows both values side by side with the change stated as not yet written", () => {
    render(<FieldCard candidate={second} decision={LASA_DECISION} siblings={[first, second]} />)
    expect(
      screen.getByText("attempt 1"),
      "the earlier attempt has to be labelled by its number, or the two columns are indistinguishable",
    ).toBeTruthy()
    expect(
      screen.getByText("now proposed"),
      "the current column has to say it is a proposal rather than the stored value",
    ).toBeTruthy()
    expect(
      screen.getByText(CHANGED_NOTE),
      "a before-and-after panel with no statement that nothing was written reads as a completed edit",
    ).toBeTruthy()
  })

  it("names a repeat as corroboration rather than as a correction", () => {
    render(<FieldCard candidate={repeat} decision={LASA_DECISION} siblings={[first, repeat]} />)
    expect(
      screen.getByText(UNCHANGED_NOTE),
      "when the caller says the same thing again, calling it a change invents an edit that did not happen",
    ).toBeTruthy()
  })

  it("renders no before-and-after panel on a first attempt", () => {
    render(<FieldCard candidate={first} decision={LASA_DECISION} siblings={[first]} />)
    expect(
      screen.queryByText("before this attempt"),
      "an empty before column on a first attempt would read as a value having been erased",
    ).toBeNull()
  })

  it("is handed the sibling candidates by the live screen rather than defaulting to none", () => {
    const source = readFileSync("src/features/intake/intake-screen/index.tsx", "utf8")
    expect(
      source,
      "the panel can only find a previous attempt if the screen passes the other candidates; without it the feature is dead on the live call",
    ).toContain("siblings={candidates}")
  })
})
