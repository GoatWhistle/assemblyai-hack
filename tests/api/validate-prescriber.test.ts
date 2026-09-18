import { POST as validatePrescriber } from "@app/api/tools/validate-prescriber/route"
import { beforeEach, describe, expect, it } from "vitest"
import { call, refusalText, resetToolEnvironment } from "./harness"

beforeEach(resetToolEnvironment)

describe("validate_prescriber", () => {
  it("passes a valid npi and reports its arithmetic", async () => {
    const body = await (
      await validatePrescriber(call("validate-prescriber", { npi: "1245319599" }))
    ).json()

    expect(body.npi.outcome).toBe("passed")
    expect(body.npi.rule_cited).toContain("80840")
    expect(body.registry_lookup).toBeNull()
  })

  it("fails a mistyped npi", async () => {
    const body = await (
      await validatePrescriber(call("validate-prescriber", { npi: "1234567890" }))
    ).json()
    expect(body.npi.outcome).toBe("failed_checksum")
  })

  it("rejects an npi that is not ten digits at the schema", async () => {
    const response = await validatePrescriber(call("validate-prescriber", { npi: "12345" }))
    expect(response.status).toBe(400)
    expect(refusalText(await response.json())).toContain("10 digits")
  })

  it("reports dea as not applicable when none was supplied", async () => {
    const body = await (
      await validatePrescriber(call("validate-prescriber", { npi: "1245319599" }))
    ).json()
    expect(body.dea.outcome).toBe("not_applicable")
  })

  it("checks a supplied dea number as well", async () => {
    const passing = await (
      await validatePrescriber(
        call("validate-prescriber", { npi: "1245319599", dea: "AB1234563" }),
      )
    ).json()
    expect(passing.dea.outcome).toBe("passed")

    const failing = await (
      await validatePrescriber(
        call("validate-prescriber", { npi: "1245319599", dea: "BX1234567" }),
      )
    ).json()
    expect(failing.dea.outcome).toBe("failed_checksum")
  })

  it("never returns the api key or the tool secret", async () => {
    const body = await (
      await validatePrescriber(call("validate-prescriber", { npi: "1245319599" }))
    ).json()
    expect(JSON.stringify(body)).not.toContain("test-tool-secret")
  })
})
