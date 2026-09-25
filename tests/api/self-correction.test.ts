import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { beforeEach, describe, expect, it } from "vitest"
import { RETRACTED_VALUE_CODE, ReasonCode } from "@/domain"
import { call, resetToolEnvironment, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

async function propose(value: string, hint: string): Promise<Record<string, unknown>> {
  const response = await proposeField(
    call("propose-field", { field: "drug_name", value, transcript_hint: hint }),
  )
  return (await response.json()) as Record<string, unknown>
}

describe("propose_field refuses a value the caller took back in the same breath", () => {
  it(`${RETRACTED_VALUE_CODE}: "lisinopril, no wait, hydralazine" cannot yield lisinopril`, async () => {
    await seedTurn("lisinopril no wait hydralazine", 0.99)
    const body = await propose("lisinopril", "lisinopril")
    expect(body.reason_code).toBe(ReasonCode.ValidatorCombo)
    expect((body.evidence as Record<string, unknown>).support_code).toBe(RETRACTED_VALUE_CODE)
    expect(body.written_to_order).toBe(false)
  })

  it("lets the value the caller settled on through to its own branch", async () => {
    await seedTurn("lisinopril no wait hydralazine", 0.99)
    const body = await propose("hydralazine", "hydralazine")
    expect(body.reason_code).not.toBe(ReasonCode.ValidatorCombo)
    expect((body.evidence as Record<string, unknown>).support_code).toBeNull()
  })
})
