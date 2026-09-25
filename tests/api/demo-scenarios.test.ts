import { GET as demoGet, POST as demoRun } from "@app/api/demo/run/route"
import { beforeEach, describe, expect, it } from "vitest"
import { type DemoRunResult, GateAction, ReasonCode } from "@/domain"
import { resetToolEnvironment } from "./harness"

beforeEach(resetToolEnvironment)

async function run(scenario: string): Promise<{ status: number; body: DemoRunResult }> {
  const response = await demoRun(
    new Request("https://readback.example.com/api/demo/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario }),
    }),
  )
  return { status: response.status, body: await response.json() }
}

describe("U4: the three new demo scenarios run through the real gate", () => {
  it(`${ReasonCode.ValidatorCombo}: a value nobody said is refused as unsupported by the speech`, async () => {
    const { status, body } = await run("unsupported_value")
    expect(status).toBe(200)
    expect(body.reasonCode).toBe(ReasonCode.ValidatorCombo)
    expect(body.decision.action).not.toBe(GateAction.Accept)
    expect(body.writtenToOrder).toBe(false)
    expect(body.sayToCaller?.toLowerCase()).toContain("lisinopril")
  })

  it(`${ReasonCode.ValidatorCatalog}: an unknown value is asked again and never substituted`, async () => {
    const { body } = await run("unknown_value")
    expect(body.reasonCode).toBe(ReasonCode.ValidatorCatalog)
    expect(body.decision.action).toBe(GateAction.AskConfirm)
    expect(body.proposedValue).toBe("venorelbine")
    expect(body.writtenToOrder).toBe(false)
  })

  it(`${ReasonCode.LasaHit}: a fluent, certain turn naming the wrong pair member is still re-asked`, async () => {
    const { body } = await run("fluent_wrong_partner")
    expect(body.reasonCode).toBe(ReasonCode.LasaHit)
    expect(body.decision.action).toBe(GateAction.AskDisambiguate)
    expect(body.decision.evidence.minConfidence).toBe(0.99)
    expect(body.sayToCaller?.toLowerCase()).toContain("tramadol")
  })

  it("refuses a scenario outside the closed list", async () => {
    expect((await run("make_it_up")).status).toBe(400)
  })

  it("keeps the GET demo on the HYDROmorphone - morphine pair", async () => {
    const body = await (await demoGet()).json()
    expect(body.outcomes[0].recognizedValue).toBe("morphine")
    expect(body.outcomes[0].reasonCode).toBe(ReasonCode.LasaHit)
    expect(body.outcomes[0].agentUtterance.toLowerCase()).toContain("hydromorphone")
  })
})
