import { POST as commitOrder } from "@app/api/tools/commit-order/route"
import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { intakeFor } from "@/tools"
import { call, resetToolEnvironment, SESSION, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

type FieldInput = { field: string; value: string; turn: number }

const ORDER: readonly FieldInput[] = [
  { field: "drug_name", value: "azithromycin", turn: 1 },
  { field: "strength", value: "200 mg/5mL", turn: 2 },
  { field: "dosage_form", value: "POWDER, FOR SUSPENSION", turn: 3 },
  { field: "route", value: "ORAL", turn: 4 },
  { field: "quantity", value: "thirty", turn: 5 },
  { field: "sig", value: "1 tablet by mouth once daily", turn: 6 },
  { field: "prescriber_npi", value: "1245319599", turn: 7 },
  { field: "prescriber_dea", value: "AB1234563", turn: 8 },
]

async function collect(input: FieldInput): Promise<string> {
  seedTurn(input.value, 0.99, input.turn)
  const proposed = await (
    await proposeField(
      call("propose-field", {
        session_id: SESSION,
        field: input.field,
        value: input.value,
        transcript_hint: input.value,
      }),
    )
  ).json()

  expect(proposed.written_to_order, `${input.field} was written by propose_field`).toBe(false)
  expect(proposed.candidate_id, `${input.field}: ${proposed.reason_code}`).not.toBeNull()

  const confirmed = await (
    await readBack(
      call("read-back", {
        session_id: SESSION,
        field: input.field,
        candidate_id: proposed.candidate_id,
        utterance: `Confirming ${input.field}: ${input.value}. Correct?`,
        caller_answer: "yes",
      }),
    )
  ).json()

  expect(confirmed.written_to_order, `${input.field} did not get written`).toBe(true)
  return proposed.candidate_id
}

describe("a whole intake from first field to committed order", () => {
  it("commits only after every critical field is a confirmed value", async () => {
    for (const field of ORDER) {
      await collect(field)
    }

    const state = intakeFor(SESSION)
    expect(state.order.fields.size).toBe(ORDER.length)

    const committed = await (
      await commitOrder(
        call("commit-order", {
          session_id: SESSION,
          full_order_read_back:
            "Reading the whole order back. azithromycin 200 mg per 5 mL, oral, quantity 30. Is all of that correct?",
          caller_confirmed: true,
        }),
      )
    ).json()

    expect(committed.committed).toBe(true)
    expect(committed.order_id.length).toBeGreaterThan(0)
    expect(committed.fields.drug_name.value).toBe("azithromycin")
    expect(committed.fields.prescriber_npi.value).toBe("1245319599")
    expect(intakeFor(SESSION).order.status).toBe("committed")
  })

  it("is idempotent, so a second call returns the same order rather than a second one", async () => {
    for (const field of ORDER) {
      await collect(field)
    }

    const body = {
      session_id: SESSION,
      full_order_read_back: "Reading the whole order back...",
      caller_confirmed: true,
    }

    const first = await (await commitOrder(call("commit-order", body))).json()
    const second = await (await commitOrder(call("commit-order", body))).json()

    expect(first.committed).toBe(true)
    expect(second.reason_code).toBe("COMMIT_REFUSED_ALREADY_COMMITTED")
    expect(second.order_id).toBe(first.order_id)
  })

  it("refuses while even one critical field is still missing", async () => {
    for (const field of ORDER.slice(0, 3)) {
      await collect(field)
    }

    const body = await (
      await commitOrder(
        call("commit-order", {
          session_id: SESSION,
          full_order_read_back: "Reading the whole order back...",
          caller_confirmed: true,
        }),
      )
    ).json()

    expect(body.committed).toBe(false)
    expect(body.missing_critical).toContain("prescriber_npi")
  })
})
