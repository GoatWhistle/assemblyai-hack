import { POST as postTurn } from "@app/api/sessions/[id]/turns/route"
import { POST as commitOrder } from "@app/api/tools/commit-order/route"
import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { UNKNOWN_SESSION_CODE } from "@/domain"
import { intakeEventStore } from "@/tools"
import { call, resetToolEnvironment } from "./harness"

const STRANGER = "never-issued-session"

function turn(sessionId: string) {
  return postTurn(
    new Request(`https://readback.example.com/api/sessions/${sessionId}/turns`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        turnOrder: 1,
        transcript: "lisinopril",
        isFormatted: false,
        words: [{ text: "lisinopril", start: 0, end: 400, confidence: 0.99 }],
      }),
    }),
    { params: Promise.resolve({ id: sessionId }) },
  )
}

beforeEach(async () => {
  await resetToolEnvironment()
})

describe(`${UNKNOWN_SESSION_CODE}: each of the two guards holds on its own`, () => {
  it(`${UNKNOWN_SESSION_CODE}: a malformed body for an unknown session is still refused as unknown, never as a fixable argument`, async () => {
    for (const handler of [proposeField, readBack, commitOrder]) {
      const response = await handler(call("any-tool", {}, undefined, STRANGER))
      const payload = await response.json()
      expect(response.status).toBe(404)
      expect(payload.code).toBe(UNKNOWN_SESSION_CODE)
      expect(payload.rejected_arguments).toBeUndefined()
    }
  })

  it(`${UNKNOWN_SESSION_CODE}: a turn for an unknown session writes no event under that id`, async () => {
    const response = await turn(STRANGER)
    expect(response.status).toBe(404)
    expect((await response.json()).code).toBe(UNKNOWN_SESSION_CODE)
    expect(await intakeEventStore().read(STRANGER)).toEqual([])
  })
})
