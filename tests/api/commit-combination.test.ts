import { POST as commitOrder } from "@app/api/tools/commit-order/route"
import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { COMMITTED_INTAKE } from "./committed-order"
import { call, readBackAloud, resetToolEnvironment, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

type Field = { readonly field: string; readonly value: string }

const DRUG_LAST_ORDER = ["strength", "dosage_form", "route", "drug_name"]

function drugLast(strength: string): readonly Field[] {
  const byField = new Map(COMMITTED_INTAKE.map((input) => [input.field, input]))
  const combination = DRUG_LAST_ORDER.map((field) =>
    field === "strength" ? { field, value: strength } : (byField.get(field) as Field),
  )
  const rest = COMMITTED_INTAKE.filter((input) => !DRUG_LAST_ORDER.includes(input.field))
  return [...combination, ...rest]
}

async function confirmEach(inputs: readonly Field[]): Promise<Record<string, unknown>[]> {
  const proposals: Record<string, unknown>[] = []
  for (const input of inputs) {
    await seedTurn(input.value, 0.99)
    const proposed = await (
      await proposeField(
        call("propose-field", {
          field: input.field,
          value: input.value,
          transcript_hint: input.value,
        }),
      )
    ).json()
    proposals.push(proposed)
    const line = `Confirming ${input.field}: ${input.value}. Correct?`
    await readBackAloud(line, "yes")
    await readBack(
      call("read-back", {
        field: input.field,
        candidate_id: proposed.candidate_id,
        utterance: line,
        caller_answer: "yes",
      }),
    )
  }
  return proposals
}

async function commit(): Promise<Record<string, unknown>> {
  return (
    await commitOrder(
      call("commit-order", {
        full_order_read_back: "Reading the whole order back. Correct?",
        caller_confirmed: true,
      }),
    )
  ).json()
}

describe("the combination is checked as a whole before an order is written", () => {
  it("refuses a strength the drug does not come in, even when the drug was named last and no proposal could check it", async () => {
    const proposals = await confirmEach(drugLast("10 mg/10mL"))
    const strength = proposals[0] as { decision?: { reason_code?: string } } | undefined
    expect(JSON.stringify(strength)).not.toContain("E_VALIDATOR_COMBO")
    const body = await commit()
    expect(body.committed).toBe(false)
    expect(body.reason_code).toBe("COMMIT_REFUSED_INCONSISTENT_COMBINATION")
    expect(body.inconsistent_fields).toEqual(["drug_name", "strength", "dosage_form", "route"])
    expect(String(body.gate_note)).toContain("checked as a whole")
  })

  it("still commits the same order when the combination is one the catalogue holds", async () => {
    await confirmEach(drugLast("100 mg/10mL"))
    const body = await commit()
    expect(body.reason_code).toBeUndefined()
    expect(body.committed).toBe(true)
  })
})
