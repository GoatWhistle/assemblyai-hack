import { describe, expect, it } from "vitest"
import { FieldName, GateAction, type GateDecision } from "@/domain"
import { INTAKE_ORDER } from "@/features/intake/field-language"
import { NOTHING_SOLICITED, solicitedField } from "@/features/intake/solicited-field"
import { LASA_CANDIDATE, NAME_CANDIDATE, NAME_DECISION } from "@/features/judge-demo/scenario"
import { initialContext, ReadBackState } from "@/features/read-back/read-back-machine"

function accepted(decision: GateDecision): GateDecision {
  return { ...decision, action: GateAction.Accept }
}

describe("what the browser believes is being asked for", () => {
  it("opens on the first field of the intake order, before anything is proposed", () => {
    const solicited = solicitedField([], new Map(), initialContext())
    expect(solicited.field).toBe(INTAKE_ORDER[0])
    expect(solicited.awaitingConfirmation).toBe(false)
  })

  it("moves to the next field once the previous one is written", () => {
    const decisions = new Map([[NAME_CANDIDATE.candidateId, accepted(NAME_DECISION)]])
    const solicited = solicitedField([NAME_CANDIDATE], decisions, initialContext())
    expect(NAME_CANDIDATE.field).toBe(FieldName.PatientName)
    expect(solicited.field).toBe(INTAKE_ORDER[1])
  })

  it("does not treat a candidate the gate is still asking about as written", () => {
    const decisions = new Map([[NAME_CANDIDATE.candidateId, NAME_DECISION]])
    const solicited = solicitedField([NAME_CANDIDATE], decisions, initialContext())
    expect(
      solicited.field,
      "a proposal the gate refused is still the field under discussion; moving on would re-tune for the wrong answer",
    ).toBe(FieldName.PatientName)
  })

  it("names the field under read-back and flags the confirmation, outranking the order", () => {
    const solicited = solicitedField(
      [LASA_CANDIDATE],
      new Map(),
      initialContext({
        state: ReadBackState.AwaitingConfirmation,
        field: FieldName.DrugName,
      }),
    )
    expect(solicited.field).toBe(FieldName.DrugName)
    expect(solicited.awaitingConfirmation).toBe(true)
  })

  it("treats a spell-out as a confirmation too, since it is still one token at a time", () => {
    const solicited = solicitedField(
      [],
      new Map(),
      initialContext({ state: ReadBackState.SpellOut, field: FieldName.PrescriberNpi }),
    )
    expect(solicited.awaitingConfirmation).toBe(true)
  })

  it("stops flagging a confirmation once the read-back has resolved", () => {
    const solicited = solicitedField(
      [],
      new Map(),
      initialContext({ state: ReadBackState.Matched, field: FieldName.DrugName }),
    )
    expect(solicited.awaitingConfirmation).toBe(false)
  })

  it("solicits nothing once every field in the order is written", () => {
    const candidates = INTAKE_ORDER.map((field, index) => ({
      ...NAME_CANDIDATE,
      candidateId: `cand-${index}`,
      field,
    }))
    const decisions = new Map(
      candidates.map((candidate) => [
        candidate.candidateId,
        accepted({ ...NAME_DECISION, candidateId: candidate.candidateId }),
      ]),
    )
    expect(solicitedField(candidates, decisions, initialContext())).toEqual(NOTHING_SOLICITED)
  })
})
