import { maxDuration, POST as proposeField } from "@app/api/tools/propose-field/route"
import { beforeEach, describe, expect, it } from "vitest"
import { buildTools } from "@/agent/tools"
import { QUOTATION_NOT_YET_RECEIVED_CODE } from "@/domain"
import { DEFAULT_QUOTATION_WAIT } from "@/tools"
import { MAX_QUOTATION_RETRIES } from "@/tools/next-step"
import { call, callerSays, intake, resetToolEnvironment, sayAgent } from "./harness"

beforeEach(resetToolEnvironment)

const GREETING = "Pharmacy intake. Go ahead with the prescription."

const LIVE_TURN =
  "Hi, this is Dr. Alan Brown, NPI 1234567893. The patient is Maria Lopez. Lisinopril, 10 mg tablet, by mouth, once daily, 30 tablets, no refills."

async function propose(field: string, value: string, hint: string) {
  return (
    await proposeField(call("propose-field", { field, value, transcript_hint: hint }))
  ).json()
}

describe(`${QUOTATION_NOT_YET_RECEIVED_CODE}: the agent quoted speech the server has not received yet`, () => {
  it("tells the agent to call again rather than asking the caller to repeat, as in the commit-hold run of 27 September", async () => {
    await sayAgent(GREETING)
    const body = await propose("patient_name", "Maria Lopez", "Maria Lopez")

    expect(
      body.reason_code,
      "the agent endpointed mid-line and called propose_field while the caller was still talking",
    ).toBe(QUOTATION_NOT_YET_RECEIVED_CODE)
    expect(body.say_to_caller).toBeNull()
    expect(body.candidate_id).toBeNull()
    expect(body.written_to_order).toBe(false)
    expect(body.retry_with).toEqual({
      field: "patient_name",
      value: "Maria Lopez",
      transcript_hint: "Maria Lopez",
    })
    expect(body.next).toContain("Do not ask the caller to repeat")
    expect((await intake()).candidates.size, "nothing reached the gate").toBe(0)
  })

  it("decides the same proposal normally once the caller's turn has arrived", async () => {
    await sayAgent(GREETING)
    await propose("patient_name", "Maria Lopez", "Maria Lopez")
    await callerSays(LIVE_TURN)
    const retried = await propose("patient_name", "Maria Lopez", "Maria Lopez")

    expect(retried.reason_code).not.toBe(QUOTATION_NOT_YET_RECEIVED_CODE)
    expect(retried.reason_code).not.toBe("E_PROVENANCE_NOT_FOUND")
    expect(retried.candidate_id).not.toBeNull()
  })

  it("does not wait on a session where nobody has spoken, because no line awaits a reply", async () => {
    const body = await propose("quantity", "thirty", "thirty")
    expect(body.reason_code).toBe("E_PROVENANCE_NOT_FOUND")
  })
})

describe("E_PROVENANCE_NOT_FOUND stays the answer when the caller's reply has arrived", () => {
  it("refuses a quotation absent from a caller turn that followed the agent's last line", async () => {
    await sayAgent(GREETING)
    await callerSays(LIVE_TURN)
    const body = await propose("drug_name", "metformin", "metformin five hundred")

    expect(
      body.reason_code,
      "the reply to the agent's last line is on the server and does not hold the quotation",
    ).toBe("E_PROVENANCE_NOT_FOUND")
    expect(body.retry_with).toBeUndefined()
  })

  it("refuses a quotation absent from a turn when the agent has not spoken since", async () => {
    await callerSays(LIVE_TURN)
    const body = await propose("drug_name", "metformin", "metformin")
    expect(body.reason_code).toBe("E_PROVENANCE_NOT_FOUND")
  })

  it("stops telling the agent to retry once the retries are spent and still no caller turn came", async () => {
    await sayAgent(GREETING)
    const codes: string[] = []
    for (let attempt = 0; attempt <= MAX_QUOTATION_RETRIES; attempt += 1) {
      codes.push((await propose("patient_name", "Maria Lopez", "Maria Lopez")).reason_code)
    }

    expect(codes).toEqual([
      ...Array.from({ length: MAX_QUOTATION_RETRIES }, () => QUOTATION_NOT_YET_RECEIVED_CODE),
      "E_PROVENANCE_NOT_FOUND",
    ])
    await callerSays("The patient is Maria Lopez.")
    await sayAgent("What is the patient's name?")
    const fresh = await propose("patient_name", "Mario Lopez", "Mario Lopez")
    expect(fresh.reason_code, "a new line from the agent opens a new wait").toBe(
      QUOTATION_NOT_YET_RECEIVED_CODE,
    )
  })
})

describe("the quotation wait fits inside the time the route and the agent allow it", () => {
  it("waits long enough for a long dictated line and still returns before either limit", () => {
    const tool = buildTools("https://readback.example.com", "secret").find(
      (t) => t.name === "propose_field",
    )
    expect(
      DEFAULT_QUOTATION_WAIT.timeoutMs,
      "the final turn of a twenty-second line reached the server about eleven seconds after the tool call",
    ).toBeGreaterThanOrEqual(12000)
    expect(DEFAULT_QUOTATION_WAIT.timeoutMs + 5000).toBeLessThanOrEqual(maxDuration * 1000)
    expect(maxDuration).toBeLessThanOrEqual(tool?.timeout_seconds ?? 0)
  })
})
