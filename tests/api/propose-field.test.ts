import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { setQuotationWait } from "@/tools"
import { call, intake, readBackAloud, resetToolEnvironment, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

function propose(field: string, value: string, hint: string): Promise<Response> {
  return proposeField(
    call("propose-field", {
      field,
      value,
      transcript_hint: hint,
    }),
  )
}

describe("propose_field", () => {
  it("writes nothing, ever, and says so in the response", async () => {
    await seedTurn("lisinopril ten milligrams", 0.99)
    const body = await (await propose("drug_name", "lisinopril", "lisinopril")).json()

    expect(body.written_to_order).toBe(false)
    expect((await intake()).order.fields.size).toBe(0)
  })

  it("asks to disambiguate a lasa hit at confidence 1.0", async () => {
    await seedTurn("morphine two milligrams", 1.0)
    const body = await (await propose("drug_name", "morphine", "morphine")).json()

    expect(body.action).toBe("ask_disambiguate")
    expect(body.reason_code).toBe("E_LASA_HIT")
    expect(body.evidence.min_confidence).toBe(1)
    expect(body.say_to_caller.toLowerCase()).toContain("hydromorphone")
    expect(body.evidence.note).toBe("asked regardless of confidence by design")
  })

  it("refuses a value it cannot trace back to the audio", async () => {
    await seedTurn("lisinopril ten milligrams", 0.99)
    const body = await (
      await propose("drug_name", "metformin", "metformin five hundred")
    ).json()

    expect(body.reason_code).toBe("E_PROVENANCE_NOT_FOUND")
    expect(body.written_to_order).toBe(false)
    expect(body.candidate_id).toBeNull()
  })

  it("waits for a caller turn that the browser has not posted yet", async () => {
    setQuotationWait({ timeoutMs: 2000, pollMs: 10 })
    const pending = propose("drug_name", "lisinopril", "lisinopril")
    await new Promise((resolve) => setTimeout(resolve, 50))
    await seedTurn("lisinopril ten milligrams", 0.99)
    const body = await (await pending).json()

    expect(body.reason_code).not.toBe("E_PROVENANCE_NOT_FOUND")
    expect(body.candidate_id).not.toBeNull()
    expect(body.waited).toBe("ready")
  })

  it("stops waiting and refuses when the quoted turn never arrives", async () => {
    setQuotationWait({ timeoutMs: 30, pollMs: 5 })
    await seedTurn("lisinopril ten milligrams", 0.99)
    const body = await (await propose("drug_name", "metformin", "metformin")).json()

    expect(body.reason_code).toBe("E_PROVENANCE_NOT_FOUND")
    expect(body.waited).toBe("timed_out")
  })

  it("carries the source span and the threshold it compared against", async () => {
    await seedTurn("thirty", 0.99)
    const body = await (await propose("quantity", "thirty", "thirty")).json()

    expect(body.evidence.span_ms).toHaveLength(2)
    expect(body.evidence.threshold).toBeGreaterThan(0)
    expect(body.evidence.rule_cited.length).toBeGreaterThan(0)
  })

  it("counts attempts up across repeated proposals of the same field", async () => {
    await seedTurn("thirty", 0.99)
    const first = await (await propose("quantity", "thirty", "thirty")).json()
    const second = await (await propose("quantity", "thirty", "thirty")).json()

    expect(first.evidence.attempt).toBe(1)
    expect(second.evidence.attempt).toBe(2)
  })

  it("rejects a field name outside the enum", async () => {
    await seedTurn("thirty", 0.99)
    const response = await propose("blood_type", "A positive", "thirty")
    expect(response.status).toBe(400)
  })
})

describe("what a tool result tells the agent to do next", () => {
  const READ_BACK = "Confirming the quantity: 30. Correct?"

  async function answer(candidateId: string, callerAnswer: string): Promise<Response> {
    await readBackAloud(READ_BACK, callerAnswer)
    return readBack(
      call("read-back", {
        field: "quantity",
        candidate_id: candidateId,
        utterance: READ_BACK,
        caller_answer: callerAnswer,
      }),
    )
  }

  it("tells the agent what is left once a value is written, so a lost candidate is handed back", async () => {
    await seedTurn("patient Maria Lopez quantity thirty", 0.99)
    const patient = await (
      await proposeField(
        call("propose-field", {
          field: "patient_name",
          value: "Maria Lopez",
          transcript_hint: "Maria Lopez",
        }),
      )
    ).json()
    const quantity = await (
      await proposeField(
        call("propose-field", {
          field: "quantity",
          value: "thirty",
          transcript_hint: "thirty",
        }),
      )
    ).json()
    expect(quantity.next).toContain("read_back")

    const body = await (await answer(quantity.candidate_id, "yes")).json()

    expect(body.written_to_order).toBe(true)
    expect(body.after_this.still_to_read_back).toEqual([
      {
        field: "patient_name",
        candidate_id: patient.candidate_id,
        say_to_caller: patient.say_to_caller,
        accepted: false,
      },
    ])
    expect(body.after_this.still_missing).toContain("drug_name")
    expect(body.after_this.still_missing).not.toContain("quantity")
    expect(body.after_this.next).toContain("patient_name")
  })

  it("writes an accepted value on the second call without waiting for a yes", async () => {
    await seedTurn("NPI 1234567893", 0.99)
    const npi = await (
      await proposeField(
        call("propose-field", {
          field: "prescriber_npi",
          value: "1234567893",
          transcript_hint: "1234567893",
        }),
      )
    ).json()
    expect(npi.action).toBe("accept")
    expect(npi.next).toContain("at once")
    const sentence = npi.say_to_caller
    const registered = await (
      await readBack(
        call("read-back", {
          field: "prescriber_npi",
          candidate_id: npi.candidate_id,
          utterance: sentence,
        }),
      )
    ).json()
    expect(registered.awaiting).toBe("nothing")
    expect(registered.written_to_order).toBe(false)

    const written = await (
      await readBack(
        call("read-back", {
          field: "prescriber_npi",
          candidate_id: npi.candidate_id,
          utterance: sentence,
          caller_answer: "NPI 1234567893",
        }),
      )
    ).json()
    expect(written.written_to_order).toBe(true)
    expect(written.confirmation_mode).toBe("validator")
  })
})
