import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { ConfirmationReason, GateAction, ReasonCode } from "@/domain"
import { contrastiveUtterance } from "@/gate"
import { call, intake, readBackAloud, resetToolEnvironment, seedTurn } from "./harness"

const PLAIN = "Confirming the drug name: morphine. Correct?"
const CONTRASTIVE = contrastiveUtterance("morphine", ["hydromorphone"])

beforeEach(resetToolEnvironment)

async function proposeMorphine(): Promise<{
  candidateId: string
  body: Record<string, unknown>
}> {
  await seedTurn("Morphine two milligrams", 1.0)
  const body = await (
    await proposeField(
      call("propose-field", {
        field: "drug_name",
        value: "Morphine",
        transcript_hint: "Morphine",
      }),
    )
  ).json()
  return { candidateId: body.candidate_id, body }
}

async function register(candidateId: string, utterance: string) {
  return (
    await readBack(
      call("read-back", { field: "drug_name", candidate_id: candidateId, utterance }),
    )
  ).json()
}

async function answer(candidateId: string, reply: string) {
  await readBackAloud(CONTRASTIVE, reply)
  return (
    await readBack(
      call("read-back", {
        field: "drug_name",
        candidate_id: candidateId,
        utterance: CONTRASTIVE,
        caller_answer: reply,
      }),
    )
  ).json()
}

describe("the read_back tool enforces the contrastive read-back for a pair-rule value", () => {
  it("the gate asks the contrastive question at certainty 1.0", async () => {
    const { body } = await proposeMorphine()
    expect(body.action).toBe(GateAction.AskDisambiguate)
    expect(body.reason_code).toBe(ReasonCode.LasaHit)
    expect(body.say_to_caller).toBe(CONTRASTIVE)
  })

  it("registering a plain read-back hands the agent the contrastive sentence instead", async () => {
    const { candidateId } = await proposeMorphine()
    const registered = await register(candidateId, PLAIN)
    expect(registered.awaiting).toBe("named_drug")
    expect(registered.say_to_caller).toBe(CONTRASTIVE)
  })

  it(`${ConfirmationReason.LasaNamedAnswerRequired}: a plain yes writes nothing and re-asks for the name`, async () => {
    const { candidateId } = await proposeMorphine()
    await register(candidateId, CONTRASTIVE)
    const body = await answer(candidateId, "yes")
    expect(body.written_to_order).toBe(false)
    expect(body.answer).toBe("unclear")
    expect(body.reason_code).toBe(ConfirmationReason.LasaNamedAnswerRequired)
    expect(body.say_to_caller).toContain("A yes cannot confirm")
    expect((await intake()).order.fields.has("drug_name")).toBe(false)
  })

  it(`${ConfirmationReason.CallerNamedValue}: the caller naming morphine writes morphine`, async () => {
    const { candidateId } = await proposeMorphine()
    await register(candidateId, CONTRASTIVE)
    const body = await answer(candidateId, "morphine")
    expect(body.written_to_order).toBe(true)
    expect(body.reason_code).toBe(ConfirmationReason.CallerNamedValue)
    expect((await intake()).order.fields.get("drug_name")?.value).toBe("morphine")
  })

  it(`${ConfirmationReason.CallerNamedPartner}: the caller naming hydromorphone corrects the order, with the caller's words as provenance`, async () => {
    const { candidateId } = await proposeMorphine()
    await register(candidateId, CONTRASTIVE)
    const body = await answer(candidateId, "hydromorphone")
    expect(body.written_to_order).toBe(true)
    expect(body.answer).toBe("corrected")
    expect(body.corrected_to).toBe("hydromorphone")
    const state = await intake()
    const written = state.order.fields.get("drug_name")
    expect(written?.value).toBe("hydromorphone")
    expect(written?.provenance.words.map((word) => word.text)).toEqual(["hydromorphone"])
    expect(written?.provenance.turnOrder).toBe(2)
    expect(state.confirmations.get("drug_name")?.reasonCode).toBe(
      ConfirmationReason.CallerNamedValue,
    )
  })
})
