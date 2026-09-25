import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  CandidateStatus,
  type ConfirmationEvidence,
  ConfirmationReason,
  type FieldCandidate,
  FieldName,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  type ValidatorName,
  VerdictOutcome,
} from "@/domain"
import {
  ConfirmationStatus,
  confirmationStatusOf,
} from "@/features/confirmation/confirmation-status"
import { FieldCard } from "@/features/field-card"
import { LISTEN_NOTE } from "@/features/field-card/said-recorded"
import { sourceBadges } from "@/features/field-card/source-badges"
import { IntakeScreen } from "@/features/intake/intake-screen"
import { SessionPhase } from "@/features/intake/session-status"
import { LASA_CANDIDATE } from "@/features/judge-demo/scenario"
import { initialContext } from "@/features/read-back/read-back-machine"

function candidate(input: {
  id: string
  field?: FieldName
  value: string
  attempt?: number
  outcome?: VerdictOutcome
  validator?: ValidatorName
}): FieldCandidate {
  return makeCandidate({
    candidateId: input.id,
    field: input.field ?? FieldName.PrescriberNpi,
    rawValue: input.value,
    normalizedValue: input.value,
    provenance: makeProvenance({
      words: [
        makeWordSpan({ text: input.value, startMs: 4200, endMs: 5900, confidence: 0.97 }),
      ],
      turnOrder: 2,
      transcriptSlice: input.value,
      sessionId: "s",
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: input.outcome ?? VerdictOutcome.Passed,
      validatorName: input.validator ?? "npi_luhn",
      detail: "fixture",
      checkedValue: input.value,
    }),
    status: CandidateStatus.Proposed,
    attempt: input.attempt ?? 1,
    createdAt: "2026-09-25T00:00:00.000Z",
  })
}

function evidence(verdict: ConfirmationEvidence["verdict"], reasonCode: ConfirmationReason) {
  return {
    field: FieldName.PrescriberNpi,
    candidateId: "npi-2",
    readBack: null,
    callerTurn: null,
    verdict,
    reasonCode,
    callerAnswerHint: null,
  } satisfies ConfirmationEvidence
}

afterEach(() => {
  vi.useRealTimers()
})

describe("U5: the field card shows what was said beside what was recorded", () => {
  it("plays the provenance segment from its own timecodes and says what it played", async () => {
    const onListen = vi.fn(async () => "synthesised" as const)
    render(
      <FieldCard
        candidate={candidate({ id: "npi-1", value: "1234567893" })}
        decision={null}
        onListen={onListen}
      />,
    )
    expect(screen.getByText("Recognizer heard")).toBeTruthy()
    expect(screen.queryByText("Caller said")).toBeNull()
    expect(screen.getByText("Recorded as")).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Listen" }))
    })
    expect(onListen).toHaveBeenCalledWith({ startMs: 4200, endMs: 5900, text: "1234567893" })
    expect(
      screen.getByText(LISTEN_NOTE.synthesised),
      "a synthesised voice standing in for a recording has to say so",
    ).toBeTruthy()
  })

  it("names where the proof came from, and lets a LASA pair show beside a passed catalogue", () => {
    expect(
      sourceBadges(candidate({ id: "a", value: "1234567893" }), null).map((b) => b.label),
    ).toEqual(["arithmetic"])
    expect(sourceBadges(LASA_CANDIDATE, null).map((badge) => badge.label)).toEqual([
      "LASA pair",
      "catalogue",
    ])
    const unsupported = candidate({
      id: "b",
      field: FieldName.DrugName,
      value: "warfarin",
      outcome: VerdictOutcome.InconsistentCombo,
      validator: "spoken_support",
    })
    expect(sourceBadges(unsupported, null).map((badge) => badge.label)).toEqual([
      "not in what was said",
    ])
    expect(
      sourceBadges(
        candidate({ id: "c", value: "1234567893" }),
        evidence("confirmed", ConfirmationReason.CallerAffirmed),
      ).map((badge) => badge.label),
    ).toContain("confirmed aloud")
  })

  it("maps every confirmation verdict to one of the four statuses", () => {
    expect(confirmationStatusOf(evidence("confirmed", ConfirmationReason.CallerAffirmed))).toBe(
      ConfirmationStatus.ConfirmedAloud,
    )
    expect(confirmationStatusOf(evidence("rejected", ConfirmationReason.CallerCorrected))).toBe(
      ConfirmationStatus.Corrected,
    )
    expect(
      confirmationStatusOf(evidence("rejected", ConfirmationReason.CallerRepeatMismatch)),
    ).toBe(ConfirmationStatus.Corrected)
    expect(confirmationStatusOf(evidence("rejected", ConfirmationReason.CallerNegated))).toBe(
      ConfirmationStatus.Refused,
    )
    expect(confirmationStatusOf(evidence("unclear", ConfirmationReason.NoCallerAnswer))).toBe(
      ConfirmationStatus.NoAnswer,
    )
  })

  it("lists every attempt at the field with its decision", () => {
    const first = candidate({
      id: "npi-1",
      value: "1234567890",
      outcome: VerdictOutcome.FailedChecksum,
    })
    const second = candidate({ id: "npi-2", value: "1234567893", attempt: 2 })
    render(<FieldCard candidate={second} decision={null} siblings={[first, second]} />)
    const history = screen.getByText("Changes to this field").parentElement as HTMLElement
    expect(within(history).getAllByRole("listitem")).toHaveLength(2)
    expect(within(history).getByText("1234567890")).toBeTruthy()
  })

  it("counts the seconds the read-back has been waiting for an answer", () => {
    vi.useFakeTimers()
    const start = Date.now()
    render(
      <FieldCard
        candidate={candidate({ id: "npi-1", value: "1234567893" })}
        decision={null}
        awaitingSinceMs={start - 3000}
        evidence={evidence("unclear", ConfirmationReason.NoCallerAnswer)}
      />,
    )
    expect(screen.getByText(/Waiting 3 s for the caller/)).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText(/Waiting 5 s for the caller/)).toBeTruthy()
    expect(screen.getByText("NO_ANSWER")).toBeTruthy()
  })
})

describe("U5: a click on a transcript word plays that word", () => {
  it("hands the word's own timecodes to the listen path", () => {
    const onListen = vi.fn(async () => "recorded" as const)
    render(
      <IntakeScreen
        candidates={[LASA_CANDIDATE]}
        decisions={new Map()}
        transcript={[]}
        readBack={initialContext()}
        phase={SessionPhase.Live}
        fault={null}
        echoDiscards={0}
        level={0}
        agentSpeaking={false}
        elapsedMs={0}
        onListen={onListen}
      />,
    )
    const card = screen.getByRole("article", { name: /drug name field card/i })
    fireEvent.click(within(card).getByRole("button", { name: /^Morphine/ }))
    expect(onListen).toHaveBeenCalledWith({ startMs: 6800, endMs: 7620, text: "Morphine" })
  })
})
