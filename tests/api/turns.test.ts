import { beforeEach, describe, expect, it } from "vitest"
import { FieldName, GateAction } from "@/domain"
import { MAX_WORDS_PER_TURN, POST as postTurn } from "../../app/api/sessions/[id]/turns/route"
import { POST as proposeField } from "../../app/api/tools/propose-field/route"
import { call, resetToolEnvironment } from "./harness"

const SESSION = "live-loop-session"

function turnRequest(body: unknown, id = SESSION): Request {
  return new Request(`https://readback.example.com/api/sessions/${id}/turns`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

function params(id = SESSION) {
  return { params: Promise.resolve({ id }) }
}

function words(text: string, confidence: number) {
  return text.split(" ").map((word, index) => ({
    text: word,
    start: 1000 + index * 300,
    end: 1000 + index * 300 + 250,
    confidence,
  }))
}

describe("the browser turn reaches the server, which is what closes the live loop", () => {
  beforeEach(() => {
    resetToolEnvironment()
  })

  it("accepts a turn with word timings and holds it", async () => {
    const response = await postTurn(
      turnRequest({
        turnOrder: 1,
        transcript: "lisinopril ten milligrams",
        isFormatted: false,
        words: words("lisinopril ten milligrams", 0.99),
      }),
      params(),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.turnsHeld).toBe(1)
    expect(body.wordsInTurn).toBe(3)
  })

  it("lets the agent's tool find provenance for a value the browser reported", async () => {
    await postTurn(
      turnRequest({
        turnOrder: 1,
        transcript: "lisinopril ten milligrams",
        isFormatted: false,
        words: words("lisinopril ten milligrams", 0.99),
      }),
      params(),
    )

    const response = await proposeField(
      call("propose-field", {
        session_id: SESSION,
        field: FieldName.DrugName,
        value: "lisinopril",
        transcript_hint: "lisinopril",
      }),
    )
    const body = await response.json()
    expect(
      body.reason_code,
      "before the turns route existed this was E_PROVENANCE_NOT_FOUND with an empty searched_turns, which meant a live session could never produce a single field",
    ).not.toBe("E_PROVENANCE_NOT_FOUND")
    expect(body.candidate_id).not.toBeNull()
    expect(body.evidence.span_ms[0]).toBeGreaterThan(0)
  })

  it("still refuses when the value cannot be traced to any recorded word", async () => {
    await postTurn(
      turnRequest({
        turnOrder: 1,
        transcript: "lisinopril ten milligrams",
        isFormatted: false,
        words: words("lisinopril ten milligrams", 0.99),
      }),
      params(),
    )

    const response = await proposeField(
      call("propose-field", {
        session_id: SESSION,
        field: FieldName.DrugName,
        value: "warfarin",
        transcript_hint: "warfarin",
      }),
    )
    const body = await response.json()
    expect(
      body.reason_code,
      "a value nobody said must not acquire provenance just because some turn was recorded",
    ).toBe("E_PROVENANCE_NOT_FOUND")
    expect(body.action).toBe(GateAction.AskConfirm)
  })

  it("replaces a turn rather than duplicating it when the same order arrives twice", async () => {
    for (const transcript of ["lisinopril", "lisinopril ten milligrams"]) {
      const response = await postTurn(
        turnRequest({
          turnOrder: 4,
          transcript,
          isFormatted: false,
          words: words(transcript, 0.99),
        }),
        params(),
      )
      const body = await response.json()
      expect(body.turnsHeld).toBe(1)
    }
  })

  it("refuses a turn with no words, because a turn without timings cannot prove anything", async () => {
    const response = await postTurn(
      turnRequest({
        turnOrder: 1,
        transcript: "lisinopril",
        isFormatted: false,
        words: [],
      }),
      params(),
    )
    expect(response.status).toBe(400)
  })

  it("refuses more words than a single turn can plausibly carry", async () => {
    const many = Array.from({ length: MAX_WORDS_PER_TURN + 1 }, (_, index) => ({
      text: "word",
      start: index * 10,
      end: index * 10 + 5,
      confidence: 0.9,
    }))
    const response = await postTurn(
      turnRequest({ turnOrder: 1, transcript: "long", isFormatted: false, words: many }),
      params(),
    )
    expect(response.status).toBe(400)
  })

  it("refuses a word whose end precedes its start", async () => {
    const response = await postTurn(
      turnRequest({
        turnOrder: 1,
        transcript: "lisinopril",
        isFormatted: false,
        words: [{ text: "lisinopril", start: 900, end: 400, confidence: 0.99 }],
      }),
      params(),
    )
    expect(
      response.status,
      "an impossible span must be refused at the boundary rather than entering provenance",
    ).toBe(422)
  })

  it("refuses a confidence outside the unit interval", async () => {
    const response = await postTurn(
      turnRequest({
        turnOrder: 1,
        transcript: "lisinopril",
        isFormatted: false,
        words: [{ text: "lisinopril", start: 100, end: 400, confidence: 1.4 }],
      }),
      params(),
    )
    expect(response.status).toBe(400)
  })

  it("keeps sessions apart, so one caller's words cannot prove another caller's field", async () => {
    await postTurn(
      turnRequest(
        {
          turnOrder: 1,
          transcript: "lisinopril ten milligrams",
          isFormatted: false,
          words: words("lisinopril ten milligrams", 0.99),
        },
        "session-a",
      ),
      params("session-a"),
    )

    const response = await proposeField(
      call("propose-field", {
        session_id: "session-b",
        field: FieldName.DrugName,
        value: "lisinopril",
        transcript_hint: "lisinopril",
      }),
    )
    const body = await response.json()
    expect(body.reason_code).toBe("E_PROVENANCE_NOT_FOUND")
  })

  it("does not require the tool secret, because the browser must never hold it", async () => {
    const response = await postTurn(
      turnRequest({
        turnOrder: 1,
        transcript: "lisinopril",
        isFormatted: false,
        words: words("lisinopril", 0.99),
      }),
      params(),
    )
    expect(response.status).toBe(200)
  })
})
