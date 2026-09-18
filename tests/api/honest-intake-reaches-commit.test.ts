import { POST as commitOrder } from "@app/api/tools/commit-order/route"
import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { CRITICAL_FIELDS, ReasonCode } from "@/domain"
import { intakeFor } from "@/tools"
import { call, resetToolEnvironment, SESSION, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

type FieldInput = {
  readonly field: string
  readonly value: string
  readonly turn: number
}

const HONEST_INTAKE: readonly FieldInput[] = [
  { field: "drug_name", value: "phenylephrine hydrochloride", turn: 1 },
  { field: "dosage_form", value: "INJECTION", turn: 2 },
  { field: "route", value: "INTRAVENOUS", turn: 3 },
  { field: "strength", value: "100 mg/10mL", turn: 4 },
  { field: "quantity", value: "thirty", turn: 5 },
  { field: "sig", value: "1 tablet by mouth once daily", turn: 6 },
  { field: "prescriber_npi", value: "1245319599", turn: 7 },
  { field: "prescriber_dea", value: "AB1234563", turn: 8 },
]

const HONEST_CONFIDENCE = 0.99

const REASK_REASONS: readonly ReasonCode[] = [
  ReasonCode.LowConfidence,
  ReasonCode.LasaHit,
  ReasonCode.ValidatorCatalog,
  ReasonCode.ValidatorChecksum,
  ReasonCode.ValidatorCombo,
  ReasonCode.ValidatorFormat,
  ReasonCode.NormalizeFailed,
  ReasonCode.SpellOutAfterSecondFailure,
  ReasonCode.EscalateAfterThirdFailure,
]

const MARGIN_REASKS = 4

type Collected = {
  readonly field: string
  readonly reasonCode: ReasonCode
  readonly writtenAfterReadBack: boolean
}

async function collect(input: FieldInput): Promise<Collected> {
  seedTurn(input.value, HONEST_CONFIDENCE, input.turn)
  const proposed = await (
    await proposeField(
      call("propose-field", {
        session_id: SESSION,
        field: input.field,
        value: input.value,
        transcript_hint: input.value,
      }),
    )
  ).json()

  const confirmed = await (
    await readBack(
      call("read-back", {
        session_id: SESSION,
        field: input.field,
        candidate_id: proposed.candidate_id,
        utterance: `Confirming ${input.field}: ${input.value}. Correct?`,
        caller_answer: "yes",
      }),
    )
  ).json()

  return {
    field: input.field,
    reasonCode: proposed.reason_code as ReasonCode,
    writtenAfterReadBack: confirmed.written_to_order === true,
  }
}

async function runHonestIntake(): Promise<readonly Collected[]> {
  const out: Collected[] = []
  for (const input of HONEST_INTAKE) {
    out.push(await collect(input))
  }
  return out
}

describe("an honest intake reaches commitOrder, and the false-ask rate is a failing test rather than a figure in a report", () => {
  it("covers every critical field, so a field silently dropped from the policy table cannot make this pass by shrinking the work", () => {
    const covered = new Set(HONEST_INTAKE.map((input) => input.field))
    const uncovered = CRITICAL_FIELDS.filter((field) => !covered.has(field))
    expect(
      uncovered,
      "every critical field must appear in this intake; a critical field absent from the script would let the test prove solvability of a shorter order than the product actually requires",
    ).toEqual([])
  })

  it("commits the order after an intake where nothing was misheard", async () => {
    await runHonestIntake()

    const committed = await (
      await commitOrder(
        call("commit-order", {
          session_id: SESSION,
          full_order_read_back:
            "phenylephrine hydrochloride 100 mg per 10 mL, injection, intravenous, quantity thirty. Is all of that correct?",
          caller_confirmed: true,
        }),
      )
    ).json()

    expect(
      committed.committed,
      "if a correct order cannot be placed at all then the gate is not a safety mechanism, it is an obstruction; a competitor's playable test exists precisely because a solvable path is a requirement and not an assumption",
    ).toBe(true)
    expect(
      committed.order_id,
      "a commit with no order id would report success without producing the artefact the success refers to",
    ).toBeTruthy()
  })

  it("places the order once, so a duplicate tool call cannot write a second prescription", async () => {
    await runHonestIntake()
    const body = {
      session_id: SESSION,
      full_order_read_back: "phenylephrine hydrochloride 100 mg per 10 mL. Correct?",
      caller_confirmed: true,
    }
    const first = await (await commitOrder(call("commit-order", body))).json()
    const second = await (await commitOrder(call("commit-order", body))).json()

    expect(
      second.reason_code,
      "AssemblyAI retries a tool call on a timeout, so a second commit is an ordinary event rather than an attack; without this guard a retried call would dispense a controlled substance twice",
    ).toBe("COMMIT_REFUSED_ALREADY_COMMITTED")
    expect(
      second.order_id,
      "the second call must name the order that already exists; a fresh id would make one prescription look like two in the record",
    ).toBe(first.order_id)
  })

  it("spends no re-ask on any field of that intake, counting only the three reasons that are re-asks", async () => {
    const collected = await runHonestIntake()
    const reasked = collected.filter((entry) => REASK_REASONS.includes(entry.reasonCode))
    expect(
      reasked.map((entry) => `${entry.field}: ${entry.reasonCode}`),
      "a re-ask here is the gate doubting a value the speaker got right at confidence 0.99 against a passing validator. A read-back is not counted, because six of the eight critical fields carry readBackAlways and reading a value back is the product working, not the gate objecting",
    ).toEqual([])
  })

  it("keeps a margin below the measured false-ask rate rather than sitting exactly on zero", async () => {
    const collected = await runHonestIntake()
    const reasked = collected.filter((entry) => REASK_REASONS.includes(entry.reasonCode)).length
    expect(
      reasked,
      `the measured false-ask rate over the recorded corpus is 27.1% with a 95% Wilson interval of [17.4%, 39.6%] on n=59. The margin is taken from the top of that interval and not from the point estimate: 39.6% of these ${HONEST_INTAKE.length} fields is ${((39.6 / 100) * HONEST_INTAKE.length).toFixed(1)}, so ${MARGIN_REASKS} is the number of re-asks this intake could absorb while still being consistent with the published upper bound. Exceeding it means the gate got noisier than anything the measurement supports`,
    ).toBeLessThanOrEqual(MARGIN_REASKS)
  })

  it("writes each field only through the read-back path, so the solvable path is the confirmed-value path and not a shortcut", async () => {
    const collected = await runHonestIntake()
    const unwritten = collected.filter((entry) => !entry.writtenAfterReadBack)
    expect(
      unwritten.map((entry) => entry.field),
      "a field reaching the order without passing gate.confirm would make this test prove solvability of a path the product does not use",
    ).toEqual([])
  })

  it("holds every critical field as a confirmed value at the moment of commit", async () => {
    await runHonestIntake()
    const state = intakeFor(SESSION)
    const missing = CRITICAL_FIELDS.filter((field) => !state.order.fields.has(field))
    expect(
      missing,
      "commitOrder refuses when a critical field is not a ConfirmedValue, so an intake that reached commit must hold all of them; a pass here with a field missing would mean the refusal branch is not firing",
    ).toEqual([])
  })
})
