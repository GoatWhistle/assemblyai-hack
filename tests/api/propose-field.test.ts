import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { beforeEach, describe, expect, it } from "vitest"
import { intakeFor } from "@/tools"
import { call, resetToolEnvironment, SESSION, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

function propose(field: string, value: string, hint: string): Promise<Response> {
  return proposeField(
    call("propose-field", {
      session_id: SESSION,
      field,
      value,
      transcript_hint: hint,
    }),
  )
}

describe("propose_field", () => {
  it("writes nothing, ever, and says so in the response", async () => {
    seedTurn("lisinopril ten milligrams", 0.99)
    const body = await (await propose("drug_name", "lisinopril", "lisinopril")).json()

    expect(body.written_to_order).toBe(false)
    expect(intakeFor(SESSION).order.fields.size).toBe(0)
  })

  it("asks to disambiguate a lasa hit at confidence 1.0", async () => {
    seedTurn("bisoprolol ten milligrams", 1.0)
    const body = await (await propose("drug_name", "bisoprolol", "bisoprolol")).json()

    expect(body.action).toBe("ask_disambiguate")
    expect(body.reason_code).toBe("E_LASA_HIT")
    expect(body.evidence.min_confidence).toBe(1)
    expect(body.say_to_caller.toLowerCase()).toContain("lisinopril")
    expect(body.evidence.note).toBe("asked regardless of confidence by design")
  })

  it("refuses a value it cannot trace back to the audio", async () => {
    seedTurn("lisinopril ten milligrams", 0.99)
    const body = await (
      await propose("drug_name", "metformin", "metformin five hundred")
    ).json()

    expect(body.reason_code).toBe("E_PROVENANCE_NOT_FOUND")
    expect(body.written_to_order).toBe(false)
    expect(body.candidate_id).toBeNull()
  })

  it("carries the source span and the threshold it compared against", async () => {
    seedTurn("thirty", 0.99)
    const body = await (await propose("quantity", "thirty", "thirty")).json()

    expect(body.evidence.span_ms).toHaveLength(2)
    expect(body.evidence.threshold).toBeGreaterThan(0)
    expect(body.evidence.rule_cited.length).toBeGreaterThan(0)
  })

  it("counts attempts up across repeated proposals of the same field", async () => {
    seedTurn("thirty", 0.99)
    const first = await (await propose("quantity", "thirty", "thirty")).json()
    const second = await (await propose("quantity", "thirty", "thirty")).json()

    expect(first.evidence.attempt).toBe(1)
    expect(second.evidence.attempt).toBe(2)
  })

  it("rejects a field name outside the enum", async () => {
    seedTurn("thirty", 0.99)
    const response = await propose("blood_type", "A positive", "thirty")
    expect(response.status).toBe(400)
  })
})
