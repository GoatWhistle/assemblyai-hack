import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { FieldName } from "@/domain"
import { intakeFor } from "@/tools"
import { call, resetToolEnvironment, SESSION, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

async function confirmQuantity(spoken: string, turnOrder: number): Promise<string> {
  seedTurn(spoken, 0.99, turnOrder)
  const proposed = await (
    await proposeField(
      call("propose-field", {
        session_id: SESSION,
        field: FieldName.Quantity,
        value: spoken,
        transcript_hint: spoken,
      }),
    )
  ).json()

  const confirmed = await (
    await readBack(
      call("read-back", {
        session_id: SESSION,
        field: FieldName.Quantity,
        candidate_id: proposed.candidate_id,
        utterance: `Confirming the quantity: ${spoken}. Correct?`,
        caller_answer: "yes",
      }),
    )
  ).json()

  expect(confirmed.written_to_order, `quantity was not written for ${spoken}`).toBe(true)
  return proposed.candidate_id
}

describe("fresh speech about an already-confirmed field withdraws the earlier confirmation", () => {
  it(
    "removes a field from the order the moment a new candidate is proposed for it, " +
      "so a caller's correction cannot leave the old value sitting in the order as though " +
      "nothing happened",
    async () => {
      await confirmQuantity("thirty", 1)
      expect(intakeFor(SESSION).order.fields.get(FieldName.Quantity)?.value).toBe(30)

      seedTurn("actually sixty", 0.98, 2)
      const revised = await (
        await proposeField(
          call("propose-field", {
            session_id: SESSION,
            field: FieldName.Quantity,
            value: "sixty",
            transcript_hint: "sixty",
          }),
        )
      ).json()

      expect(
        intakeFor(SESSION).order.fields.has(FieldName.Quantity),
        "the moment the caller speaks a new value for the same field, the old ConfirmedValue must no longer sit in the order as current, even before the new one is confirmed",
      ).toBe(false)
      expect(revised.candidate_id).not.toBeNull()
    },
  )

  it("writes the revised value once it, too, is confirmed", async () => {
    await confirmQuantity("thirty", 1)

    seedTurn("sixty", 0.98, 2)
    const revised = await (
      await proposeField(
        call("propose-field", {
          session_id: SESSION,
          field: FieldName.Quantity,
          value: "sixty",
          transcript_hint: "sixty",
        }),
      )
    ).json()

    await readBack(
      call("read-back", {
        session_id: SESSION,
        field: FieldName.Quantity,
        candidate_id: revised.candidate_id,
        utterance: "Confirming the quantity: 60. Correct?",
        caller_answer: "yes",
      }),
    )

    expect(intakeFor(SESSION).order.fields.get(FieldName.Quantity)?.value).toBe(60)
  })

  it(
    "does not construct a second ConfirmedValue out of thin air: the withdrawn field is " +
      "simply absent from the order until a new candidate is proved and confirmed",
    async () => {
      await confirmQuantity("thirty", 1)
      seedTurn("sixty", 0.98, 2)
      await proposeField(
        call("propose-field", {
          session_id: SESSION,
          field: FieldName.Quantity,
          value: "sixty",
          transcript_hint: "sixty",
        }),
      )

      const state = intakeFor(SESSION)
      expect(state.order.fields.has(FieldName.Quantity)).toBe(false)
      expect(
        [...state.candidates.values()].filter((c) => c.field === FieldName.Quantity).length,
        "both the original and the revised candidate remain in history; only current order membership changed",
      ).toBe(2)
    },
  )

  it("leaves an untouched field alone when a different field is revised", async () => {
    await confirmQuantity("thirty", 1)

    seedTurn("azithromycin", 0.98, 2)
    await proposeField(
      call("propose-field", {
        session_id: SESSION,
        field: FieldName.DrugName,
        value: "azithromycin",
        transcript_hint: "azithromycin",
      }),
    )

    expect(intakeFor(SESSION).order.fields.get(FieldName.Quantity)?.value).toBe(30)
  })
})
