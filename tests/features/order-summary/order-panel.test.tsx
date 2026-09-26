import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  CandidateStatus,
  type ConfirmationEvidence,
  ConfirmationReason,
  CRITICAL_FIELDS,
  type FieldCandidate,
  FieldName,
  type GateDecision,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  policyFor,
  type ValidatorName,
  VerdictOutcome,
} from "@/domain"
import type { LiveOrderSnapshot } from "@/features/order-summary/live-snapshot"
import { readSnapshot } from "@/features/order-summary/live-snapshot"
import { groupOrder } from "@/features/order-summary/order-groups"
import { AWAITING_VERIFICATION, OrderPanel } from "@/features/order-summary/order-panel"
import { decide } from "@/gate"

function candidate(
  field: FieldName,
  value: string,
  outcome: VerdictOutcome,
  validator: ValidatorName,
): FieldCandidate {
  return makeCandidate({
    candidateId: `cand-${field}`,
    field,
    rawValue: value,
    normalizedValue: value,
    provenance: makeProvenance({
      words: [makeWordSpan({ text: value, startMs: 1000, endMs: 1600, confidence: 0.99 })],
      turnOrder: 1,
      transcriptSlice: value,
      sessionId: "s",
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome,
      validatorName: validator,
      detail: "fixture",
      checkedValue: value,
    }),
    status: CandidateStatus.Proposed,
    attempt: 1,
    createdAt: "2026-09-25T00:00:00.000Z",
  })
}

const FORM = candidate(
  FieldName.DosageForm,
  "TABLET",
  VerdictOutcome.Passed,
  "combo_consistency",
)
const NPI = candidate(
  FieldName.PrescriberNpi,
  "1234567890",
  VerdictOutcome.FailedChecksum,
  "npi_luhn",
)

function decisions(...list: FieldCandidate[]): ReadonlyMap<string, GateDecision> {
  return new Map(
    list.map((entry) => [entry.candidateId, decide(entry, policyFor(entry.field))]),
  )
}

const CONFIRMED_SIG: ConfirmationEvidence = {
  field: FieldName.Sig,
  candidateId: "cand-sig",
  readBack: {
    replyId: "reply-4",
    text: "One tablet by mouth at night, correct?",
    completed: true,
    playedMs: 2400,
    durationMs: 2400,
  },
  callerTurn: {
    turnOrder: 5,
    transcript: "Yes.",
    words: [makeWordSpan({ text: "Yes.", startMs: 18200, endMs: 18500, confidence: 0.99 })],
  },
  verdict: "confirmed",
  reasonCode: ConfirmationReason.CallerAffirmed,
  callerAnswerHint: "yes",
}

function snapshot(overrides: Partial<LiveOrderSnapshot> = {}): LiveOrderSnapshot {
  return {
    orderId: "ord-7f3a",
    referenceNumber: "7F3A2C",
    status: "in_progress",
    confirmedFields: [FieldName.Sig],
    abortedFields: [],
    confirmations: [CONFIRMED_SIG],
    commitRefusals: [],
    awaitingConfirmation: null,
    actualModel: "universal-3-5-pro",
    ...overrides,
  }
}

describe("U6: the pharmacist's view of the order", () => {
  it("puts values the gate stopped first, then the three groups", () => {
    const groups = groupOrder({
      candidates: [FORM, NPI],
      decisions: decisions(FORM, NPI),
      snapshot: snapshot(),
    })
    expect(groups.stopped.map((row) => row.field)).toEqual([FieldName.PrescriberNpi])
    expect(groups.proved.map((row) => row.field)).toEqual([FieldName.DosageForm])
    expect(groups.confirmed.map((row) => row.field)).toEqual([FieldName.Sig])
    render(<OrderPanel groups={groups} snapshot={snapshot()} />)
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
    expect(headings[0]).toBe("Stopped by the gate")
  })

  it("blocks the commit while a critical field is unresolved, and says which", () => {
    const groups = groupOrder({
      candidates: [FORM],
      decisions: decisions(FORM),
      snapshot: null,
    })
    expect(groups.commitBlocked).toBe(true)
    expect(groups.missingCritical).toContain(FieldName.DrugName)
    render(<OrderPanel groups={groups} snapshot={null} />)
    expect(screen.getByText("Commit blocked")).toBeTruthy()
    expect(screen.getByText(/Drug name/, { selector: "output span" })).toBeTruthy()
  })

  it("shows the hold refusing a commit before the write", () => {
    const refused = snapshot({
      commitRefusals: [
        {
          atMs: Date.UTC(2026, 8, 25, 10, 4, 5),
          missing: [FieldName.DrugName],
          reasonCode: "E_COMMIT_REFUSED",
        },
      ],
    })
    const groups = groupOrder({ candidates: [], decisions: new Map(), snapshot: refused })
    render(<OrderPanel groups={groups} snapshot={refused} />)
    expect(
      screen.getByText(/refused commitOrder before the write at 10:04:05 UTC/),
    ).toBeTruthy()
  })

  it("shows the reference number and awaiting verification after a commit, and nothing else changes", () => {
    const committed = snapshot({ status: "committed", confirmedFields: [...CRITICAL_FIELDS] })
    const groups = groupOrder({
      candidates: [FORM],
      decisions: decisions(FORM),
      snapshot: committed,
    })
    render(<OrderPanel groups={groups} snapshot={committed} />)
    expect(screen.getByText("7F3A2C")).toBeTruthy()
    expect(screen.getByText(AWAITING_VERIFICATION)).toBeTruthy()
    expect(screen.queryByText("Commit blocked")).toBeNull()
  })

  it("prints the confirmation with both turns and their timecodes", () => {
    const groups = groupOrder({ candidates: [], decisions: new Map(), snapshot: snapshot() })
    render(<OrderPanel groups={groups} snapshot={snapshot()} />)
    const receipt = screen
      .getByText("Confirmed aloud by the caller")
      .closest("div") as HTMLElement
    expect(within(receipt).getByText(/One tablet by mouth at night/)).toBeTruthy()
    expect(within(receipt).getByText("0:18.20–0:18.50")).toBeTruthy()
    expect(within(receipt).getAllByText("0:02.40")).toHaveLength(2)
  })

  it("admits it does not know the commit state when the server never reported it", () => {
    const settled = groupOrder({
      candidates: [],
      decisions: new Map(),
      snapshot: null,
    })
    const everything = { ...settled, commitBlocked: false, missingCritical: [] }
    render(<OrderPanel groups={everything} snapshot={null} />)
    expect(screen.getByText(/has not reported the order's commit state/)).toBeTruthy()
  })
})

describe("the snapshot reader refuses a malformed body instead of guessing", () => {
  it("returns null for a missing or partial snapshot", () => {
    expect(readSnapshot(undefined)).toBeNull()
    expect(readSnapshot({ orderId: "x", status: "committed" })).toBeNull()
    expect(readSnapshot({ ...snapshot(), status: "shipped" })).toBeNull()
    expect(readSnapshot(snapshot())?.referenceNumber).toBe("7F3A2C")
  })
})
