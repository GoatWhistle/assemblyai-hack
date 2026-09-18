import { POST as turnsRoute } from "@app/api/sessions/[id]/turns/route"
import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { beforeEach, describe, expect, it } from "vitest"
import {
  FieldName,
  InvalidWordSpanError,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  policyFor,
  ReasonCode,
  VerdictOutcome,
  type WordSpan,
} from "@/domain"
import { decide } from "@/gate"
import { intakeFor, recordTurn } from "@/tools"
import { call, resetToolEnvironment, SESSION, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

const TURN_SESSION = "unscored-confidence-session"

type Body = Record<string, unknown>

const UNSCORED: readonly unknown[] = [undefined, null, Number.NaN, "0.99", 1.5, -0.1]

function unscoredWord(confidence: unknown): WordSpan {
  return Object.freeze({
    text: "lisinopril",
    startMs: 0,
    endMs: 400,
    confidence: confidence as number,
    speaker: null,
    wordIsFinal: true,
  })
}

function postTurn(words: readonly unknown[]): Promise<Response> {
  return turnsRoute(
    new Request(`https://readback.example.com/api/sessions/${TURN_SESSION}/turns`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        turnOrder: 1,
        transcript: "lisinopril ten milligrams",
        isFormatted: false,
        words,
      }),
    }),
    { params: Promise.resolve({ id: TURN_SESSION }) },
  )
}

describe("a turn without confidence is not a turn without problems", () => {
  it("refuses every unscored confidence at the turns route", async () => {
    for (const confidence of UNSCORED) {
      const response = await postTurn([{ text: "lisinopril", start: 0, end: 400, confidence }])
      expect(
        response.status,
        `words[] arrives from the browser, so ${String(confidence)} is a shape a client can really send; taking it and carrying on would mean the recognizer said nothing about this word and the pipeline read that as fine`,
      ).toBeGreaterThanOrEqual(400)
      expect(
        intakeFor(TURN_SESSION).turns.length,
        "an unscored turn is refused rather than stored, so no later proposal can point its provenance at it",
      ).toBe(0)
    }
  })

  it("refuses a turn where only one word of many is unscored", async () => {
    const response = await postTurn([
      { text: "lisinopril", start: 0, end: 400, confidence: 0.99 },
      { text: "ten", start: 420, end: 600 },
      { text: "milligrams", start: 620, end: 900, confidence: 0.98 },
    ])

    expect(
      response.status,
      "the gate compares the minimum confidence over the span, so one unscored word poisons the minimum; a per-turn check that only looked at the first word would let the drug name pass on the strength of the units",
    ).toBeGreaterThanOrEqual(400)
    expect(
      intakeFor(TURN_SESSION).turns.length,
      "the turn is refused whole, because a partially scored turn cannot be trusted to yield a minimum",
    ).toBe(0)
  })

  it("refuses an unscored word at the store, not only at the route schema", () => {
    const state = intakeFor(TURN_SESSION)

    expect(
      () =>
        recordTurn(state, {
          turnOrder: 1,
          transcript: "lisinopril ten milligrams",
          isFormatted: false,
          words: [unscoredWord(undefined)],
        }),
      "the zod schema on one route is not the invariant; the store is reached from every caller, and a check that lived only in the route would be bypassed the moment a second writer appeared",
    ).toThrow(InvalidWordSpanError)
    expect(
      state.turns.length,
      "the refusal happens before the turn is kept, so a rejected turn leaves no half-written state",
    ).toBe(0)
  })

  it("refuses to build provenance over an unscored word", () => {
    for (const confidence of UNSCORED) {
      expect(
        () =>
          makeProvenance({
            words: [unscoredWord(confidence)],
            turnOrder: 1,
            transcriptSlice: "lisinopril",
            sessionId: SESSION,
          }),
        `makeProvenance computes minConfidence with Math.min, and ${String(confidence)} makes that NaN; the check belongs here because a structurally typed WordSpan can be handed in by any caller without passing makeWordSpan first`,
      ).toThrow(InvalidWordSpanError)
    }
  })

  it("names the word and the turn when it refuses, so the client can be fixed", () => {
    let message = ""
    try {
      makeProvenance({
        words: [unscoredWord(Number.NaN)],
        turnOrder: 7,
        transcriptSlice: "lisinopril",
        sessionId: SESSION,
      })
    } catch (error) {
      message = (error as Error).message
    }

    expect(
      message,
      "the word is named because a browser sending one unscored word among fifty is otherwise impossible to locate",
    ).toContain("lisinopril")
    expect(
      message,
      "the turn is named for the same reason: the refusal has to point at the turn that has to be resent",
    ).toContain("7")
  })

  it("would have accepted the value outright if an unscored word reached the gate", () => {
    const provenance = {
      words: [unscoredWord(Number.NaN)],
      turnOrder: 1,
      transcriptSlice: "one two four five three one nine five nine nine",
      sessionId: SESSION,
      sttTurnIsFormatted: false,
      minConfidence: Number.NaN,
      meanConfidence: Number.NaN,
      startMs: 0,
      endMs: 400,
      spokenText: "one two four five three one nine five nine nine",
    }
    const candidate = makeCandidate({
      candidateId: "unscored",
      field: FieldName.PrescriberNpi,
      rawValue: "1245319599",
      normalizedValue: "1245319599",
      provenance,
      verdict: makeVerdict({
        outcome: VerdictOutcome.Passed,
        validatorName: "npi_luhn",
        detail: "the checksum holds",
        checkedValue: "1245319599",
        evidence: {},
      }),
      attempt: 1,
    })

    const decision = decide(candidate, policyFor(FieldName.PrescriberNpi))

    expect(
      decision.reasonCode,
      "this is why the check sits upstream and not inside the gate: NaN < threshold is false, so the low-confidence branch is skipped and an unscored word reads as a high-confidence pass on a field that is not read back at all; decide() has exactly three reasons to re-ask and adding a fourth here would destroy that, so the value must never arrive in this shape",
    ).toBe(ReasonCode.ValidatorPassedHighConf)
    expect(
      Number.isNaN(decision.evidence.minConfidence as number),
      "the recorded evidence would carry NaN as the minimum confidence, which is a number nobody can compare against the threshold it is printed beside",
    ).toBe(true)
  })

  it("keeps a raised low-confidence flag raised when the rest of the turn is certain", async () => {
    const state = intakeFor(SESSION)
    recordTurn(state, {
      turnOrder: 1,
      transcript: "lisinopril ten milligrams",
      isFormatted: false,
      words: [
        makeWordSpan({ text: "lisinopril", startMs: 0, endMs: 400, confidence: 0.4 }),
        makeWordSpan({ text: "ten", startMs: 420, endMs: 600, confidence: 1 }),
        makeWordSpan({ text: "milligrams", startMs: 620, endMs: 900, confidence: 1 }),
      ],
    })

    const body = (await (
      await proposeField(
        call("propose-field", {
          session_id: SESSION,
          field: FieldName.DrugName,
          value: "lisinopril",
          transcript_hint: "lisinopril ten milligrams",
        }),
      )
    ).json()) as Body

    expect(
      (body.evidence as Record<string, unknown>).min_confidence,
      "the minimum over the span is what the gate compares, so two certain words cannot average away one uncertain one; a mean here would be the same defect as an absent confidence",
    ).toBe(0.4)
    expect(
      body.action,
      "the flag stays raised: the drug name was heard at 0.4 and the surrounding certainty is about different words",
    ).not.toBe("accept")
  })

  it("accepts a fully scored turn, so the check is not refusing every turn", async () => {
    seedTurn("lisinopril ten milligrams", 0.99)

    expect(
      intakeFor(SESSION).turns.length,
      "the negative control: a guard that rejected scored turns too would empty the transcript the quotation invariant depends on",
    ).toBe(1)
    const response = await postTurn([
      { text: "lisinopril", start: 0, end: 400, confidence: 0.99 },
    ])
    expect(
      response.status,
      "a well-formed turn from the browser is still recorded through the route",
    ).toBe(200)
  })
})
