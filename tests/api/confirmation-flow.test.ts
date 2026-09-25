import { POST as postTurn } from "@app/api/sessions/[id]/turns/route"
import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { type AgentTurn, ConfirmationReason, STALE_PROPOSAL_CODE } from "@/domain"
import { DEFAULT_CONFIRMATION_WAIT, setConfirmationWait } from "@/tools"
import { call, callerSays, intake, resetToolEnvironment, SESSION, seedTurn } from "./harness"

const DRUG_READ_BACK = "Confirming the drug name: lisinopril. Correct?"

beforeEach(resetToolEnvironment)

afterEach(() => {
  setConfirmationWait({ timeoutMs: 0, pollMs: 1 })
})

function agentTurnRequest(turn: Omit<AgentTurn, "role">): Request {
  return new Request(`https://readback.example.com/api/sessions/${SESSION}/turns`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role: "agent", ...turn }),
  })
}

async function postAgent(overrides: Partial<Omit<AgentTurn, "role">> = {}): Promise<number> {
  const response = await postTurn(
    agentTurnRequest({
      replyId: overrides.replyId ?? "reply-read-back",
      text: overrides.text ?? DRUG_READ_BACK,
      status: overrides.status ?? "completed",
      playedMs: overrides.playedMs ?? 2400,
      durationMs: overrides.durationMs ?? 2400,
    }),
    { params: Promise.resolve({ id: SESSION }) },
  )
  return response.status
}

async function proposeDrug(): Promise<string> {
  await seedTurn("the drug is lisinopril", 0.99)
  const body = await (
    await proposeField(
      call("propose-field", {
        field: "drug_name",
        value: "lisinopril",
        transcript_hint: "lisinopril",
      }),
    )
  ).json()
  return body.candidate_id
}

async function confirmWithHint(candidateId: string, hint: string) {
  return (
    await readBack(
      call("read-back", {
        field: "drug_name",
        candidate_id: candidateId,
        utterance: DRUG_READ_BACK,
        caller_answer: hint,
      }),
    )
  ).json()
}

describe("a confirmation is judged from the recorded turns through the real routes", () => {
  it(`${ConfirmationReason.CallerAffirmed}: an agent turn posted by the browser plus a spoken yes writes the value`, async () => {
    const candidateId = await proposeDrug()
    expect(await postAgent()).toBe(200)
    await callerSays("yes")
    const body = await confirmWithHint(candidateId, "yes")
    expect(body.written_to_order).toBe(true)
    expect(body.evidence.read_back_reply_id).toBe("reply-read-back")
    expect(body.evidence.caller_text).toBe("yes")
    expect((await intake()).confirmations.get("drug_name")?.verdict).toBe("confirmed")
  })

  it(`${ConfirmationReason.ReadBackInterrupted}: a barged-in read-back cannot be confirmed`, async () => {
    const candidateId = await proposeDrug()
    await postAgent({ status: "interrupted", playedMs: 900 })
    await callerSays("yes")
    const body = await confirmWithHint(candidateId, "yes")
    expect(body.written_to_order).toBe(false)
    expect(body.reason_code).toBe(ConfirmationReason.ReadBackInterrupted)
  })

  it(`${ConfirmationReason.CallerNegated}: the model's caller_answer is a hint, never the evidence`, async () => {
    const candidateId = await proposeDrug()
    await postAgent()
    await callerSays("yeah, no")
    const body = await confirmWithHint(candidateId, "yes")
    expect(
      body.written_to_order,
      "the LLM wrote yes into caller_answer while the caller said no; the server must believe the words",
    ).toBe(false)
    expect(body.answer).toBe("rejected")
    expect(body.evidence.caller_answer_hint).toBe("yes")
  })

  for (const phrase of [
    "yes but the dose is wrong",
    "right, no, twenty",
    "yes, bisoprolol",
    "mhm",
    "uh-huh",
    "okay",
    "thank you",
  ]) {
    it(`never confirms "${phrase}" through the route`, async () => {
      const candidateId = await proposeDrug()
      await postAgent()
      await callerSays(phrase)
      const body = await confirmWithHint(candidateId, "yes")
      expect(body.written_to_order).toBe(false)
      expect(body.answer).not.toBe("confirmed")
    })
  }

  it(`${ConfirmationReason.NoCallerAnswer}: waits for the answer, then says unclear and re-asks`, async () => {
    setConfirmationWait({ timeoutMs: 60, pollMs: 5 })
    const candidateId = await proposeDrug()
    await postAgent()
    const started = Date.now()
    const body = await confirmWithHint(candidateId, "yes")
    expect(Date.now() - started).toBeGreaterThanOrEqual(55)
    expect(body.waited).toBe("timed_out")
    expect(body.answer).toBe("unclear")
    expect(body.reason_code).toBe(ConfirmationReason.NoCallerAnswer)
    expect(body.written_to_order).toBe(false)
    expect(body.say_to_caller).toContain("lisinopril")
  })

  it(`${ConfirmationReason.CallerAffirmed}: an answer arriving during the wait is used`, async () => {
    setConfirmationWait({ timeoutMs: 1500, pollMs: 5 })
    const candidateId = await proposeDrug()
    await postAgent()
    const pending = confirmWithHint(candidateId, "yes")
    await new Promise((resolve) => setTimeout(resolve, 20))
    await callerSays("yes")
    const body = await pending
    expect(body.waited).toBe("ready")
    expect(body.written_to_order).toBe(true)
  })

  it("defaults the production wait to 1.5 seconds", () => {
    expect(DEFAULT_CONFIRMATION_WAIT.timeoutMs).toBe(1500)
  })
})

describe(`${STALE_PROPOSAL_CODE}: a proposal quoting an older turn than the latest about its field`, () => {
  it("is refused with reassess the latest statement", async () => {
    await seedTurn("the quantity is thirty", 0.99)
    await seedTurn("no wait, the quantity is sixty", 0.99)
    const body = await (
      await proposeField(
        call("propose-field", {
          field: "quantity",
          value: "thirty",
          transcript_hint: "the quantity is thirty",
        }),
      )
    ).json()
    expect(body.reason_code).toBe(STALE_PROPOSAL_CODE)
    expect(body.say_to_caller).toBe("reassess the latest statement")
    expect(body.written_to_order).toBe(false)
    expect((await intake()).candidates.size).toBe(0)
  })

  it("still accepts a proposal quoting the latest statement", async () => {
    await seedTurn("the quantity is thirty", 0.99)
    await seedTurn("no wait, the quantity is sixty", 0.99)
    const body = await (
      await proposeField(
        call("propose-field", {
          field: "quantity",
          value: "sixty",
          transcript_hint: "the quantity is sixty",
        }),
      )
    ).json()
    expect(body.reason_code).not.toBe(STALE_PROPOSAL_CODE)
    expect(body.candidate_id).not.toBeNull()
  })
})
