import { POST as commitOrder } from "@app/api/tools/commit-order/route"
import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { SessionStorageError, UpstreamError } from "@/domain"
import {
  createMemoryStore,
  installSessionStore,
  isPlaceholderPatientName,
  PLACEHOLDER_VALUE_CODE,
} from "@/sessions"
import { createMemoryEventStore, type IntakeEventStore, installIntakeEventStore } from "@/tools"
import { confirmHonestIntake } from "./committed-order"
import { call, intake, resetToolEnvironment, SESSION, seedTurn } from "./harness"

beforeEach(async () => {
  await resetToolEnvironment()
  installSessionStore(createMemoryStore())
})

function failingStore(base: IntakeEventStore, error: Error): IntakeEventStore {
  return {
    ...base,
    read: async () => Promise.reject(error),
    append: async () => Promise.reject(error),
  }
}

const TOOLS = [
  [proposeField, "propose-field", { field: "drug_name", value: "x", transcript_hint: "x" }],
  [
    readBack,
    "read-back",
    { field: "drug_name", candidate_id: "c", utterance: "u", caller_answer: "yes" },
  ],
  [commitOrder, "commit-order", { full_order_read_back: "r", caller_confirmed: true }],
] as const

describe("H12: a failing store never becomes an invented answer", () => {
  for (const [label, error, status] of [
    ["an unconfigured production store", new SessionStorageError("no store"), 503],
    ["a store answering 500", new UpstreamError(500, "the intake log store answered 500"), 422],
    ["an unexpected exception", new Error("boom"), 500],
  ] as const) {
    it(`reports ${label} as a failure on every session tool`, async () => {
      installIntakeEventStore(failingStore(createMemoryEventStore(), error))
      for (const [handler, path, body] of TOOLS) {
        const response = await handler(call(path, body))
        const payload = await response.json()
        expect(response.status, path).toBeGreaterThanOrEqual(400)
        expect(payload.written_to_order, path).not.toBe(true)
        expect(payload.committed, path).not.toBe(true)
        expect(payload.answer, path).not.toBe("confirmed")
        expect(response.status, path).toBe(status)
      }
    })
  }
})

describe("H2: two concurrent commit_order calls place exactly one order", () => {
  it("commits once, stores once, and answers the loser as already committed", async () => {
    await confirmHonestIntake()
    const puts: string[] = []
    const memory = createMemoryStore()
    installSessionStore({
      ...memory,
      put: async (session) => {
        puts.push(session.sessionId)
        await memory.put(session)
      },
    })
    const body = { full_order_read_back: "Reading it back. Correct?", caller_confirmed: true }
    const replies = await Promise.all([
      commitOrder(call("commit-order", body)).then((r) => r.json()),
      commitOrder(call("commit-order", body)).then((r) => r.json()),
    ])
    const placed = replies.filter(
      (reply) => reply.committed === true && reply.reason_code === undefined,
    )
    expect(placed).toHaveLength(1)
    expect(
      replies.filter((reply) => reply.reason_code === "COMMIT_REFUSED_ALREADY_COMMITTED"),
    ).toHaveLength(1)
    expect(puts).toEqual([SESSION])
    expect((await intake()).order.status).toBe("committed")
  })
})

describe(`H1: ${PLACEHOLDER_VALUE_CODE} refuses a placeholder patient name before the gate`, () => {
  for (const placeholder of ["unknown", "Patient", "n/a", "test", "N/A."]) {
    it(`refuses "${placeholder}"`, async () => {
      await seedTurn(`the patient is ${placeholder}`, 0.99)
      const body = await (
        await proposeField(
          call("propose-field", {
            field: "patient_name",
            value: placeholder,
            transcript_hint: placeholder,
          }),
        )
      ).json()
      expect(body.reason_code).toBe(PLACEHOLDER_VALUE_CODE)
      expect(body.say_to_caller).toContain("actual name")
      expect(body.candidate_id).toBeNull()
      expect((await intake()).candidates.size).toBe(0)
    })
  }

  it("still proposes a real name", async () => {
    expect(isPlaceholderPatientName("Maria Lopez")).toBe(false)
    await seedTurn("the patient is Maria Lopez", 0.99)
    const body = await (
      await proposeField(
        call("propose-field", {
          field: "patient_name",
          value: "Maria Lopez",
          transcript_hint: "Maria Lopez",
        }),
      )
    ).json()
    expect(body.reason_code).not.toBe(PLACEHOLDER_VALUE_CODE)
    expect(body.candidate_id).not.toBeNull()
  })
})
