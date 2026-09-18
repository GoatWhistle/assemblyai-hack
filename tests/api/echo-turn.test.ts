import { beforeEach, describe, expect, it } from "vitest"
import { FieldName } from "@/domain"
import { POST as postTurn } from "../../app/api/sessions/[id]/turns/route"
import { POST as proposeField } from "../../app/api/tools/propose-field/route"
import { call, resetToolEnvironment } from "./harness"

const SESSION = "echo-turn-session"

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
  beforeEach(() => {
    resetToolEnvironment()
  })

  it(
    "refuses a turn whose transcript matches a re-ask this server itself generated, " +
      "even though the browser labelled it exactly like any caller turn",
    async () => {
      await postTurn(
        turnRequest({
          turnOrder: 1,
          transcript: "bisoprolol ten milligrams",
          isFormatted: false,
          words: words("bisoprolol ten milligrams", 1.0),
        }),
        params(),
      )

      const proposed = await (
        await proposeField(
          call("propose-field", {
            session_id: SESSION,
            field: FieldName.DrugName,
            value: "bisoprolol",
            transcript_hint: "bisoprolol",
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
        transcript: "bisoprolol ten milligrams",
        isFormatted: false,
        words: words("bisoprolol ten milligrams", 1.0),
      }),
      params(),
    )
    await proposeField(
      call("propose-field", {
        session_id: SESSION,
        field: FieldName.DrugName,
        value: "bisoprolol",
        transcript_hint: "bisoprolol",
      }),
    )

    const response = await postTurn(
      turnRequest({
        turnOrder: 2,
        transcript: "lisinopril",
        isFormatted: false,
        words: words("lisinopril", 0.98),
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
          transcript: "bisoprolol ten milligrams",
          isFormatted: false,
          words: words("bisoprolol ten milligrams", 1.0),
        }),
        params(),
      )
      const proposed = await (
        await proposeField(
          call("propose-field", {
            session_id: SESSION,
            field: FieldName.DrugName,
            value: "bisoprolol",
            transcript_hint: "bisoprolol",
          }),
        )
      ).json()
      expect(proposed.say_to_caller.toLowerCase()).toContain("lisinopril")

      const response = await postTurn(
        turnRequest({
          turnOrder: 2,
          transcript: "lisinopril",
          isFormatted: false,
          words: words("lisinopril", 0.97),
        }),
        params(),
      )
      expect(
        response.status,
        "the caller answering a LASA disambiguation question with the correct drug name must not be treated as an echo of the question that asked it",
      ).toBe(200)
    },
  )
})
