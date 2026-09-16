import { POST as commitOrder } from "@app/api/tools/commit-order/route"
import { beforeEach, describe, expect, it } from "vitest"
import {
  call,
  resetToolEnvironment,
  responseBytes,
  SESSION,
  TOOL_RESPONSE_LIMIT,
} from "./harness"

beforeEach(resetToolEnvironment)

function commit(
  callerConfirmed: boolean,
  readBack = "Reading the whole order back...",
): Promise<Response> {
  return commitOrder(
    call("commit-order", {
      session_id: SESSION,
      full_order_read_back: readBack,
      caller_confirmed: callerConfirmed,
    }),
  )
}

describe("commit_order", () => {
  it("refuses when a critical field has no confirmed value, and that refusal is the demo", async () => {
    const body = await (await commit(true)).json()

    expect(body.committed).toBe(false)
    expect(body.reason_code).toBe("COMMIT_REFUSED_MISSING_CRITICAL")
    expect(body.missing_critical).toContain("drug_name")
    expect(body.gate_note).toContain("ConfirmedValue")
  })

  it("names every missing critical field, not just the first", async () => {
    const body = await (await commit(true)).json()
    for (const field of ["drug_name", "strength", "quantity", "sig", "prescriber_npi"]) {
      expect(body.missing_critical, field).toContain(field)
    }
  })

  it("refuses when the caller never confirmed the full read back", async () => {
    const body = await (await commit(false)).json()

    expect(body.committed).toBe(false)
    expect(body.reason_code).toBe("COMMIT_REFUSED_NO_FULL_READBACK")
    expect(body.gate_note).toContain("own judgement")
  })

  it("checks the caller confirmation before it checks the fields", async () => {
    const body = await (await commit(false)).json()
    expect(body.reason_code).toBe("COMMIT_REFUSED_NO_FULL_READBACK")
  })

  it("stays under the eight kibibyte response limit on a refusal", async () => {
    const body = await (await commit(true, "x".repeat(500))).json()
    expect(responseBytes(body)).toBeLessThanOrEqual(TOOL_RESPONSE_LIMIT)
  })

  it("speaks the refusal in words the agent can say aloud", async () => {
    const body = await (await commit(true)).json()
    expect(body.say_to_caller).toContain("cannot place this order")
    expect(body.say_to_caller).not.toContain("_")
  })

  it("requires the shared secret like every other tool", async () => {
    const response = await commitOrder(
      call(
        "commit-order",
        { session_id: SESSION, full_order_read_back: "x", caller_confirmed: true },
        null,
      ),
    )
    expect(response.status).toBe(401)
  })
})
