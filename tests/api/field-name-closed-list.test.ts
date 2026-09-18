import { POST as commitOrder } from "@app/api/tools/commit-order/route"
import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { FIELD_NAMES, FieldName } from "@/domain"
import { intakeFor } from "@/tools"
import { call, refusalText, resetToolEnvironment, SESSION, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

const POLLUTING_NAMES: readonly string[] = ["__proto__", "constructor", "prototype"]

const UNKNOWN_NAMES: readonly string[] = [
  "blood_type",
  "drug_Name",
  "drug name",
  "",
  "toString",
  "valueOf",
  "hasOwnProperty",
]

type Body = Record<string, unknown>

function proposeWith(field: string): Promise<Response> {
  return proposeField(
    call("propose-field", {
      session_id: SESSION,
      field,
      value: "thirty",
      transcript_hint: "thirty",
    }),
  )
}

function readBackWith(field: string, candidateId: string): Promise<Response> {
  return readBack(
    call("read-back", {
      session_id: SESSION,
      field,
      candidate_id: candidateId,
      utterance: "Confirming: thirty. Correct?",
      caller_answer: "yes",
    }),
  )
}

describe("a field name is on the closed list or the write is refused", () => {
  it("refuses every prototype-bearing name at propose_field with a 400", async () => {
    seedTurn("thirty", 0.99)
    for (const field of POLLUTING_NAMES) {
      const response = await proposeWith(field)
      expect(
        response.status,
        `an object key like ${field} must never reach a Map key or storage; a field name is checked against the closed list before anything indexes with it, and the refusal is a 400 because the arguments are wrong, not the state`,
      ).toBe(400)
      const body = (await response.json()) as Body
      expect(
        refusalText(body),
        "the refusal names the field that was rejected, so an agent that keeps sending it can be diagnosed from the log",
      ).toContain(field)
    }
  })

  it("leaves Object.prototype untouched after the attempt", async () => {
    seedTurn("thirty", 0.99)
    for (const field of POLLUTING_NAMES) {
      await proposeWith(field)
    }

    const probe = {} as Record<string, unknown>
    expect(
      probe.thirty,
      "the executable form of the check: if a rejected name had been used as a key on a plain object, a fresh object would inherit the value and every later lookup in the process would be poisoned",
    ).toBeUndefined()
    expect(
      Object.hasOwn(Object.prototype, "thirty"),
      "an own property on Object.prototype is the durable damage, and it survives the request that caused it",
    ).toBe(false)
    expect(
      intakeFor(SESSION).order.fields.size,
      "no rejected name may leave a trace in the order either",
    ).toBe(0)
  })

  it("refuses unknown and near-miss names rather than storing them as text", async () => {
    seedTurn("thirty", 0.99)
    for (const field of UNKNOWN_NAMES) {
      const response = await proposeWith(field)
      expect(
        response.status,
        `${field === "" ? "an empty field name" : field} is not on the closed list, and a name that is merely unrecognised must be refused rather than kept as a string nobody has a policy for; accepting it would mean a field with no threshold, no validator and no read-back rule`,
      ).toBe(400)
    }
  })

  it("keeps the order keyed only by names from the closed list", async () => {
    seedTurn("thirty", 0.99)
    await proposeWith("quantity")
    for (const field of [...POLLUTING_NAMES, ...UNKNOWN_NAMES]) {
      await proposeWith(field)
    }

    const state = intakeFor(SESSION)
    for (const candidate of state.candidates.values()) {
      expect(
        FIELD_NAMES.includes(candidate.field),
        "every candidate the server remembers carries a field name from the closed list, so nothing downstream has to re-check it",
      ).toBe(true)
    }
    for (const key of state.order.fields.keys()) {
      expect(
        FIELD_NAMES.includes(key),
        "the order is a Map and its keys are the field names; one key from outside the list would make the order shape unpredictable for everything that reads it",
      ).toBe(true)
    }
  })

  it("refuses a read_back whose field disagrees with the candidate it names", async () => {
    seedTurn("Jane Doe", 0.5)
    const proposal = (await (
      await proposeField(
        call("propose-field", {
          session_id: SESSION,
          field: FieldName.PatientName,
          value: "Jane Doe",
          transcript_hint: "Jane Doe",
        }),
      )
    ).json()) as Body

    const response = await readBackWith(FieldName.PrescriberNpi, String(proposal.candidate_id))
    const body = (await response.json()) as Body

    expect(
      body.written_to_order,
      "both names are on the closed list, so the enum cannot catch this: a candidate proved for one field would be confirmed under another field's policy, and a patient name would inherit the thresholds of an arithmetic identifier",
    ).toBe(false)
    expect(
      String(body.error),
      "the refusal names both fields, because the whole defect is the disagreement between them",
    ).toContain(FieldName.PatientName)
    expect(
      body.field,
      "the response reports the field the candidate was actually proved for, so the audit record cannot say one field while the write meant another",
    ).toBe(FieldName.PatientName)
    expect(
      intakeFor(SESSION).order.fields.size,
      "nothing is written under either name when the two disagree",
    ).toBe(0)
  })

  it("refuses a read_back naming a field outside the closed list", async () => {
    seedTurn("thirty", 0.99)
    const proposal = (await (await proposeWith("quantity")).json()) as Body

    for (const field of POLLUTING_NAMES) {
      const response = await readBackWith(field, String(proposal.candidate_id))
      expect(
        response.status,
        `read_back is the only route that writes, so ${field} has to be refused there too; guarding propose_field alone would leave the write itself open`,
      ).toBe(400)
    }
    expect(
      intakeFor(SESSION).order.fields.size,
      "the order stays empty, which is the property that matters rather than the status code",
    ).toBe(0)
  })

  it("still lets a real field name through, so the closed list is not refusing everything", async () => {
    seedTurn("thirty", 0.99)
    const response = await proposeWith("quantity")

    expect(
      response.status,
      "the negative control: a closed list that rejected valid names too would be indistinguishable from a broken route",
    ).toBe(200)
    const body = (await response.json()) as Body
    expect(
      body.field,
      "the accepted name comes back unchanged, which is what lets the agent match the decision to the field it asked about",
    ).toBe("quantity")
  })

  it("commits an order whose keys all came from the closed list", async () => {
    seedTurn("thirty", 0.99)
    const response = await commitOrder(
      call("commit-order", {
        session_id: SESSION,
        full_order_read_back: "Reading the whole order back.",
        caller_confirmed: true,
      }),
    )
    const body = (await response.json()) as Body

    expect(
      body.committed,
      "an empty order is refused for missing critical fields, which also means no rejected name could have filled one",
    ).toBe(false)
    for (const field of (body.missing_critical as readonly string[]) ?? []) {
      expect(
        FIELD_NAMES.includes(field as FieldName),
        "even the refusal reports field names from the closed list only; a name from outside it in this array would mean the order tracked a field nobody defined",
      ).toBe(true)
    }
  })
})
