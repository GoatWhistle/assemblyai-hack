import { POST as commitOrder } from "@app/api/tools/commit-order/route"
import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import type { MetricKind } from "@/domain"
import { call, intake, readBackAloud, resetToolEnvironment, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

async function kindsOf(): Promise<readonly MetricKind[]> {
  return (await intake()).events.map((event) => event.kind)
}

describe("MetricEvent is emitted by the product, not merely declared", () => {
  it("records session_started the first time a session is touched", async () => {
    await seedTurn("lisinopril ten milligrams", 0.99)
    expect(await kindsOf(), "registering the session must open the event log").toContain(
      "session_started",
    )
  })

  it("records turn_received for each turn the server accepts", async () => {
    await seedTurn("lisinopril ten milligrams", 0.99)
    const events = (await intake()).events.filter((event) => event.kind === "turn_received")
    expect(events, "a recorded turn must leave a trace in the event log").toHaveLength(1)
  })

  it("records field_proposed and gate_decided on a propose_field call", async () => {
    await seedTurn("lisinopril ten milligrams", 0.99)
    await proposeField(
      call("propose-field", {
        field: "drug_name",
        value: "lisinopril",
        transcript_hint: "lisinopril",
      }),
    )
    const kinds = await kindsOf()
    expect(kinds, "a proposed field must be visible in the event log").toContain(
      "field_proposed",
    )
    expect(kinds, "the gate's own decision must be visible in the event log").toContain(
      "gate_decided",
    )
  })

  it("records read_back_requested and read_back_matched on a confirmed read-back", async () => {
    await seedTurn("thirty", 0.99)
    const proposal = await (
      await proposeField(
        call("propose-field", {
          field: "quantity",
          value: "thirty",
          transcript_hint: "thirty",
        }),
      )
    ).json()

    await readBackAloud("I have thirty. Is that right?", "yes")
    await readBack(
      call("read-back", {
        field: "quantity",
        candidate_id: proposal.candidate_id,
        utterance: "I have thirty. Is that right?",
        caller_answer: "yes",
      }),
    )

    const kinds = await kindsOf()
    expect(kinds, "a read-back request must be visible in the event log").toContain(
      "read_back_requested",
    )
    expect(kinds, "a matched read-back must be visible in the event log").toContain(
      "read_back_matched",
    )
  })

  it("records read_back_failed when the caller does not confirm", async () => {
    await seedTurn("thirty", 0.99)
    const proposal = await (
      await proposeField(
        call("propose-field", {
          field: "quantity",
          value: "thirty",
          transcript_hint: "thirty",
        }),
      )
    ).json()

    await readBackAloud("I have thirty. Is that right?", "no")
    await readBack(
      call("read-back", {
        field: "quantity",
        candidate_id: proposal.candidate_id,
        utterance: "I have thirty. Is that right?",
        caller_answer: "no",
      }),
    )

    expect(
      await kindsOf(),
      "a rejected read-back must be visible in the event log, not silently dropped",
    ).toContain("read_back_failed")
  })

  it("records order_refused when commit_order is refused for a missing field", async () => {
    await commitOrder(
      call("commit-order", {
        full_order_read_back: "reading it back",
        caller_confirmed: true,
      }),
    )
    expect(
      await kindsOf(),
      "a refused commit must be visible in the event log, matching the reason code returned to the caller",
    ).toContain("order_refused")
  })
})
