import { beforeEach, describe, expect, it } from "vitest"
import { FieldName } from "@/domain"
import { intakeFor, markAborted, missingByOutcome, outcomeFor } from "@/tools"
import { POST as commitOrder } from "../../app/api/tools/commit-order/route"
import { POST as proposeField } from "../../app/api/tools/propose-field/route"
import { call, resetToolEnvironment, SESSION, seedTurn } from "./harness"

describe("confirmed, refused and never-asked are three states, not one absence", () => {
  beforeEach(() => {
    resetToolEnvironment()
  })

  it("calls a field never-asked when no candidate for it exists", () => {
    const state = intakeFor(SESSION)
    expect(outcomeFor(state, FieldName.DrugName)).toBe("never_asked")
  })

  it("calls a field refused once the gate has seen a candidate and not accepted it", async () => {
    seedTurn("venorelbine ten milligrams", 0.99)
    await proposeField(
      call("propose-field", {
        session_id: SESSION,
        field: FieldName.DrugName,
        value: "venorelbine",
        transcript_hint: "venorelbine",
      }),
    )
    const state = intakeFor(SESSION)
    expect(
      outcomeFor(state, FieldName.DrugName),
      "a value the gate examined and refused is not the same as a value nobody mentioned; reporting both as missing hides which one the agent should re-ask",
    ).toBe("refused_by_gate")
  })

  it("calls a field abandoned once it was aborted for the pharmacy", () => {
    const state = intakeFor(SESSION)
    markAborted(state, FieldName.DaysSupply)
    expect(outcomeFor(state, FieldName.DaysSupply)).toBe("abandoned")
  })

  it("puts every missing critical field in exactly one bucket", async () => {
    seedTurn("venorelbine ten milligrams", 0.99)
    await proposeField(
      call("propose-field", {
        session_id: SESSION,
        field: FieldName.DrugName,
        value: "venorelbine",
        transcript_hint: "venorelbine",
      }),
    )
    const state = intakeFor(SESSION)
    const grouped = missingByOutcome(state)
    const total =
      grouped.never_asked.length + grouped.refused_by_gate.length + grouped.abandoned.length
    const seen = new Set([
      ...grouped.never_asked,
      ...grouped.refused_by_gate,
      ...grouped.abandoned,
    ])
    expect(seen.size, "a field counted twice would overstate what is outstanding").toBe(total)
    expect(grouped.refused_by_gate).toContain(FieldName.DrugName)
  })

  it("tells the agent which fields are pointless to ask for again", async () => {
    seedTurn("venorelbine ten milligrams", 0.99)
    await proposeField(
      call("propose-field", {
        session_id: SESSION,
        field: FieldName.DrugName,
        value: "venorelbine",
        transcript_hint: "venorelbine",
      }),
    )
    const response = await commitOrder(
      call("commit-order", {
        session_id: SESSION,
        full_order_read_back: "Reading the whole order back.",
        caller_confirmed: true,
      }),
    )
    const body = await response.json()
    expect(body.committed).toBe(false)
    expect(
      body.refused_by_gate,
      "the refusal must name the fields the gate rejected, or the agent asks for them the same way and loops",
    ).toContain(FieldName.DrugName)
    expect(body.say_to_caller).toMatch(/did not accept/i)
  })

  it("does not claim a field was refused when the conversation simply never reached it", async () => {
    const response = await commitOrder(
      call("commit-order", {
        session_id: SESSION,
        full_order_read_back: "Reading the whole order back.",
        caller_confirmed: true,
      }),
    )
    const body = await response.json()
    expect(
      body.refused_by_gate,
      "an untouched order must report nothing as refused; a false refusal in a safety record is worse than a gap",
    ).toEqual([])
    expect(body.never_asked.length).toBeGreaterThan(0)
  })
})
