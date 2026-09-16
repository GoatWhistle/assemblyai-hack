import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { intakeFor } from "@/tools"
import { call, resetToolEnvironment, SESSION, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

async function proposeQuantity(): Promise<string> {
  seedTurn("thirty", 0.99)
  const body = await (
    await proposeField(
      call("propose-field", {
        session_id: SESSION,
        field: "quantity",
        value: "thirty",
        transcript_hint: "thirty",
      }),
    )
  ).json()
  return body.candidate_id
}

function answer(candidateId: string, callerAnswer: string): Promise<Response> {
  return readBack(
    call("read-back", {
      session_id: SESSION,
      field: "quantity",
      candidate_id: candidateId,
      utterance: "Confirming the quantity: 30. Correct?",
      caller_answer: callerAnswer,
    }),
  )
}

describe("read_back", () => {
  it("treats anything other than an explicit yes as not confirmed", async () => {
    const candidateId = await proposeQuantity()

    for (const reply of ["uh", "what?", "maybe", "", "could you repeat that"]) {
      const body = await (await answer(candidateId, reply)).json()
      expect(body.written_to_order, `${reply} was treated as a yes`).toBe(false)
    }
  })

  it("writes the value only on an explicit yes", async () => {
    const candidateId = await proposeQuantity()
    const body = await (await answer(candidateId, "yes")).json()

    expect(body.written_to_order).toBe(true)
    expect(body.confirmation_mode).toBe("read_back")
    expect(intakeFor(SESSION).order.fields.get("quantity")?.value).toBe(30)
  })

  it("accepts the documented affirmations and rejects the denials", async () => {
    for (const yes of ["yes", "yeah", "correct", "that's right", "confirmed", "right"]) {
      resetToolEnvironment()
      const candidateId = await proposeQuantity()
      const body = await (await answer(candidateId, yes)).json()
      expect(body.written_to_order, yes).toBe(true)
    }

    for (const no of ["no", "nope", "wrong", "not quite", "negative"]) {
      resetToolEnvironment()
      const candidateId = await proposeQuantity()
      const body = await (await answer(candidateId, no)).json()
      expect(body.written_to_order, no).toBe(false)
      expect(body.answer).toBe("rejected")
    }
  })

  it("registers the awaited answer before the agent speaks", async () => {
    const candidateId = await proposeQuantity()
    const body = await (
      await readBack(
        call("read-back", {
          session_id: SESSION,
          field: "quantity",
          candidate_id: candidateId,
          utterance: "Confirming the quantity: 30. Correct?",
        }),
      )
    ).json()

    expect(body.registered).toBe(true)
    expect(body.awaiting).toBe("yes_no")
    expect(body.written_to_order).toBe(false)
  })

  it("cannot confirm a candidate the gate never saw", async () => {
    await proposeQuantity()
    const body = await (await answer("candidate-that-does-not-exist", "yes")).json()

    expect(body.written_to_order).toBe(false)
    expect(body.error).toContain("no gate decision")
  })

  it("stores the spelled out utterance literally, not the normalized value", async () => {
    const candidateId = await proposeQuantity()
    const spoken = "three zero"
    const body = await (
      await readBack(
        call("read-back", {
          session_id: SESSION,
          field: "quantity",
          candidate_id: candidateId,
          utterance: spoken,
          style: "spell_out",
          caller_answer: "yes",
        }),
      )
    ).json()

    expect(body.read_back_utterance).toBe(spoken)
    expect(body.confirmation_mode).toBe("spell_out")
  })
})
