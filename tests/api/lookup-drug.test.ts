import { POST as lookupDrug } from "@app/api/tools/lookup-drug/route"
import { beforeEach, describe, expect, it } from "vitest"
import { call, resetToolEnvironment, responseBytes, TOOL_RESPONSE_LIMIT } from "./harness"

beforeEach(resetToolEnvironment)

describe("tool authentication", () => {
  it("rejects a call with no secret", async () => {
    const response = await lookupDrug(call("lookup-drug", { query: "lisinopril" }, null))
    expect(response.status).toBe(401)
  })

  it("rejects a call with the wrong secret", async () => {
    const response = await lookupDrug(call("lookup-drug", { query: "lisinopril" }, "wrong"))
    expect(response.status).toBe(401)
    expect((await response.json()).code).toBe("TOOL_AUTH_FAILED")
  })

  it("rejects a body that does not match the schema", async () => {
    const response = await lookupDrug(call("lookup-drug", { query: "" }))
    expect(response.status).toBe(400)
  })
})

describe("lookup_drug", () => {
  it("returns real combos and stays under the eight kibibyte limit", async () => {
    const response = await lookupDrug(call("lookup-drug", { query: "lisinopril", limit: 3 }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.matches.length).toBeGreaterThan(0)
    expect(body.matches[0].combos.length).toBeGreaterThan(0)
    expect(responseBytes(body)).toBeLessThanOrEqual(TOOL_RESPONSE_LIMIT)
  })

  it("warns about a sound alike pair before the agent proposes anything", async () => {
    const body = await (await lookupDrug(call("lookup-drug", { query: "Bisoprolol" }))).json()

    expect(body.lasa_warning.hit).toBe(true)
    expect(body.lasa_warning.confusable_with).toContain("lisinopril")
    expect(body.note).toContain("read_back")
  })

  it("reports no warning for a drug in no pair", async () => {
    const paired = await (await lookupDrug(call("lookup-drug", { query: "cefazolin" }))).json()
    expect(paired.lasa_warning.hit).toBe(true)

    const clean = await (await lookupDrug(call("lookup-drug", { query: "amoxicillin" }))).json()
    expect(clean.lasa_warning.hit).toBe(false)
    expect(clean.note).toBeNull()
  })

  it("resolves a bare spoken name against a salted catalogue entry", async () => {
    const body = await (await lookupDrug(call("lookup-drug", { query: "tramadol" }))).json()
    expect(body.matches[0].nonproprietary_name).toBe("tramadol hydrochloride")
  })
})
