import { beforeEach, describe, expect, it } from "vitest"
import { FieldName, QUOTATION_NOT_YET_RECEIVED_CODE } from "@/domain"
import { POST as postTurn } from "../../app/api/sessions/[id]/turns/route"
import { POST as proposeField } from "../../app/api/tools/propose-field/route"
import { call, resetToolEnvironment, SESSION } from "./harness"

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

describe("a turn spoken by the agent can never become a source of provenance, server-side", () => {
  beforeEach(async () => {
    await resetToolEnvironment()
  })

  it(
    "refuses a turn whose transcript matches a re-ask this server itself generated, " +
      "even though the browser labelled it exactly like any caller turn",
    async () => {
      await postTurn(
        turnRequest({
          turnOrder: 1,
          transcript: "morphine two milligrams",
          isFormatted: false,
          words: words("morphine two milligrams", 1.0),
        }),
        params(),
      )

      const proposed = await (
        await proposeField(
          call("propose-field", {
            field: FieldName.DrugName,
            value: "morphine",
            transcript_hint: "morphine",
          }),
        )
      ).json()
      expect(proposed.action).toBe("ask_disambiguate")

      const echoedTranscript = proposed.say_to_caller

      const response = await postTurn(
        turnRequest({
          turnOrder: 2,
          transcript: echoedTranscript,
          isFormatted: false,
          words: words(echoedTranscript.replace(/[^a-zA-Z0-9 ]/g, ""), 0.9),
        }),
        params(),
      )

      expect(
        response.status,
        "the recognizer picking up the agent's own re-ask through an unmuted path must not enter the turn history at all",
      ).toBe(422)
      const body = await response.json()
      expect(body.code).toBe("ECHO_TURN_REJECTED")
    },
  )

  it("still accepts an unrelated caller turn after an agent line has been recorded", async () => {
    await postTurn(
      turnRequest({
        turnOrder: 1,
        transcript: "morphine two milligrams",
        isFormatted: false,
        words: words("morphine two milligrams", 1.0),
      }),
      params(),
    )
    await proposeField(
      call("propose-field", {
        field: FieldName.DrugName,
        value: "morphine",
        transcript_hint: "morphine",
      }),
    )

    const response = await postTurn(
      turnRequest({
        turnOrder: 2,
        transcript: "hydromorphone",
        isFormatted: false,
        words: words("hydromorphone", 0.98),
      }),
      params(),
    )
    expect(response.status).toBe(200)
  })

  it(
    "still accepts the caller's short, genuine answer to a long disambiguation question, " +
      "even when that answer shares one word with the agent's line",
    async () => {
      await postTurn(
        turnRequest({
          turnOrder: 1,
          transcript: "morphine two milligrams",
          isFormatted: false,
          words: words("morphine two milligrams", 1.0),
        }),
        params(),
      )
      const proposed = await (
        await proposeField(
          call("propose-field", {
            field: FieldName.DrugName,
            value: "morphine",
            transcript_hint: "morphine",
          }),
        )
      ).json()
      expect(proposed.say_to_caller.toLowerCase()).toContain("hydromorphone")

      const response = await postTurn(
        turnRequest({
          turnOrder: 2,
          transcript: "hydromorphone",
          isFormatted: false,
          words: words("hydromorphone", 0.97),
        }),
        params(),
      )
      expect(
        response.status,
        "the caller answering a LASA disambiguation question with the correct drug name must not be treated as an echo of the question that asked it",
      ).toBe(200)
    },
  )

  it("H9: refuses a caller turn that repeats an agent line the browser posted, and never proposes from it", async () => {
    const line = "Reading the whole order back. Hydromorphone two milligrams tablet, by mouth."
    const agent = await postTurn(
      turnRequest({
        role: "agent",
        replyId: "reply-echo",
        text: line,
        status: "completed",
        playedMs: 3000,
        durationMs: 3000,
      }),
      params(),
    )
    expect(agent.status).toBe(200)
    const echoed = await postTurn(
      turnRequest({
        turnOrder: 7,
        transcript: line,
        isFormatted: true,
        words: words(line.replace(/[^a-zA-Z0-9 ]/g, ""), 0.95),
      }),
      params(),
    )
    expect(echoed.status).toBe(422)
    const proposed = await (
      await proposeField(
        call("propose-field", {
          field: FieldName.DrugName,
          value: "hydromorphone",
          transcript_hint: "Hydromorphone two milligrams",
        }),
      )
    ).json()
    expect(
      proposed.candidate_id,
      "the agent's own words must never become the provenance of a value",
    ).toBeNull()
    expect(
      proposed.reason_code,
      "a refused echo is not the caller's reply, so the server is still waiting for one",
    ).toBe(QUOTATION_NOT_YET_RECEIVED_CODE)
  })

  describe("the commit-hold run of 27 September: a caller repeating a value before the agent read it back", () => {
    const dictation =
      "Hi, this is Dr. Alan Brown, NPI 1234567893. The patient is Maria Lopez. Lisinopril, 10 mg Tablet, by mouth, once daily."

    async function gateLineForPatient(): Promise<string> {
      await postTurn(
        turnRequest({
          turnOrder: 0,
          transcript: dictation,
          isFormatted: true,
          words: words(dictation.replace(/[^a-zA-Z0-9 ]/g, ""), 0.97),
        }),
        params(),
      )
      const proposed = await (
        await proposeField(
          call("propose-field", {
            field: FieldName.PatientName,
            value: "Maria Lopez",
            transcript_hint: "Maria Lopez",
          }),
        )
      ).json()
      return String(proposed.say_to_caller)
    }

    async function caller(turnOrder: number, transcript: string): Promise<number> {
      const response = await postTurn(
        turnRequest({
          turnOrder,
          transcript,
          isFormatted: true,
          words: words(transcript.replace(/[^a-zA-Z0-9 ]/g, ""), 0.97),
        }),
        params(),
      )
      return response.status
    }

    it("accepts the caller's own sentence even though every word of it is in the gate's line", async () => {
      const line = await gateLineForPatient()
      expect(line).toBe("Let me confirm the patient name: Maria Lopez. Is that right?")
      expect(
        await caller(1, "The patient is Maria Lopez."),
        "refused with overlap 1.00 in production, because the measure ignored word order",
      ).toBe(200)
    })

    it("still refuses a contiguous fragment of that line", async () => {
      const line = await gateLineForPatient()
      const fragment = line
        .replace(/^Let me /, "")
        .replace(/[.?:,]/g, "")
        .split(" ")
        .slice(0, 6)
      expect(await caller(1, fragment.join(" "))).toBe(422)
    })
  })
})
