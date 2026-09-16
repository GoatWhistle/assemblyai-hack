import { describe, expect, it } from "vitest"
import {
  ConfirmationMode,
  type ConfirmedValue,
  emptyOrder,
  FieldName,
  GateAction,
  GateViolationError,
  policyFor,
  setField,
  VerdictOutcome,
} from "@/domain"
import { confirm, decide } from "@/gate"
import { candidateFor } from "./factory"

describe("confirm is the only constructor of ConfirmedValue", () => {
  it("builds a confirmed value from an accept", () => {
    const candidate = candidateFor({
      field: FieldName.Refills,
      rawValue: "2",
      normalizedValue: 2,
      validatorName: "range_check",
    })
    const decision = decide(candidate, policyFor(FieldName.Refills))
    expect(decision.action).toBe(GateAction.Accept)

    const value = confirm({
      candidate,
      policy: policyFor(FieldName.Refills),
      decision,
      confirmationMode: ConfirmationMode.Validator,
      callerConfirmed: false,
    })

    expect(value.value).toBe(2)
    expect(value.field).toBe(FieldName.Refills)
    expect(value.confirmationMode).toBe(ConfirmationMode.Validator)
    expect(value.provenance.words.length).toBeGreaterThan(0)
  })

  it("builds a confirmed value from a read back the caller answered yes to", () => {
    const candidate = candidateFor({
      field: FieldName.Quantity,
      rawValue: "30",
      normalizedValue: 30,
      validatorName: "range_check",
    })
    const decision = decide(candidate, policyFor(FieldName.Quantity))

    const value = confirm({
      candidate,
      policy: policyFor(FieldName.Quantity),
      decision,
      confirmationMode: ConfirmationMode.ReadBack,
      callerConfirmed: true,
    })

    expect(value.confirmationMode).toBe(ConfirmationMode.ReadBack)
  })

  it("refuses an escalated decision", () => {
    const policy = policyFor(FieldName.DrugName)
    const candidate = candidateFor({
      field: FieldName.DrugName,
      attempt: policy.maxAttemptsBeforeEscalation,
    })
    const decision = decide(candidate, policy)
    expect(decision.action).toBe(GateAction.EscalateHuman)

    expect(() =>
      confirm({
        candidate,
        policy,
        decision,
        confirmationMode: ConfirmationMode.HumanOverride,
        callerConfirmed: true,
      }),
    ).toThrow(GateViolationError)
  })

  it("refuses a read back the caller did not confirm", () => {
    const candidate = candidateFor({
      field: FieldName.Quantity,
      rawValue: "30",
      normalizedValue: 30,
      validatorName: "range_check",
    })
    const decision = decide(candidate, policyFor(FieldName.Quantity))

    expect(() =>
      confirm({
        candidate,
        policy: policyFor(FieldName.Quantity),
        decision,
        confirmationMode: ConfirmationMode.ReadBack,
        callerConfirmed: false,
      }),
    ).toThrow(/without an explicit yes/)
  })

  it("refuses a value that failed its validator without a spoken confirmation", () => {
    const candidate = candidateFor({
      field: FieldName.PrescriberNpi,
      rawValue: "1234567890",
      outcome: VerdictOutcome.FailedChecksum,
      validatorName: "npi_luhn",
    })
    const decision = decide(candidate, policyFor(FieldName.PrescriberNpi))

    expect(() =>
      confirm({
        candidate,
        policy: policyFor(FieldName.PrescriberNpi),
        decision,
        confirmationMode: ConfirmationMode.SpellOut,
        callerConfirmed: false,
      }),
    ).toThrow(GateViolationError)
  })

  it("refuses a field with no validator when the caller said nothing", () => {
    const candidate = candidateFor({
      field: FieldName.PatientName,
      rawValue: "Jane Doe",
      outcome: VerdictOutcome.NotApplicable,
      validatorName: "none",
    })
    const decision = decide(candidate, policyFor(FieldName.PatientName))

    expect(() =>
      confirm({
        candidate,
        policy: policyFor(FieldName.PatientName),
        decision,
        confirmationMode: ConfirmationMode.ReadBack,
        callerConfirmed: false,
      }),
    ).toThrow(GateViolationError)
  })

  it("refuses a decision belonging to another candidate", () => {
    const candidate = candidateFor({
      field: FieldName.Refills,
      normalizedValue: 2,
      validatorName: "range_check",
    })
    const other = candidateFor({
      field: FieldName.Refills,
      normalizedValue: 3,
      validatorName: "range_check",
      attempt: 2,
    })
    const decision = decide(other, policyFor(FieldName.Refills))

    expect(() =>
      confirm({
        candidate,
        policy: policyFor(FieldName.Refills),
        decision,
        confirmationMode: ConfirmationMode.Validator,
        callerConfirmed: true,
      }),
    ).toThrow(/does not|belongs to/)
  })

  it("refuses a value that could not be normalized", () => {
    const candidate = candidateFor({
      field: FieldName.Quantity,
      rawValue: "a month's worth",
      normalizedValue: null,
      validatorName: "range_check",
    })
    const decision = decide(candidate, policyFor(FieldName.Quantity))

    expect(() =>
      confirm({
        candidate,
        policy: policyFor(FieldName.Quantity),
        decision,
        confirmationMode: ConfirmationMode.ReadBack,
        callerConfirmed: true,
      }),
    ).toThrow(/no normalized value/)
  })

  it("a plain object literal is not assignable to ConfirmedValue", () => {
    const candidate = candidateFor({
      field: FieldName.Refills,
      normalizedValue: 2,
      validatorName: "range_check",
    })
    const forged = {
      field: FieldName.Refills,
      value: 2,
      provenance: candidate.provenance,
      verdict: candidate.verdict,
      confirmationMode: ConfirmationMode.Validator,
      candidateId: candidate.candidateId,
      confirmedAt: new Date().toISOString(),
    }

    // @ts-expect-error
    const typed: ConfirmedValue = forged
    expect(typed.value).toBe(2)
  })

  it("setField accepts only what confirm produced", () => {
    const candidate = candidateFor({
      field: FieldName.Refills,
      normalizedValue: 2,
      validatorName: "range_check",
    })
    const decision = decide(candidate, policyFor(FieldName.Refills))
    const value = confirm({
      candidate,
      policy: policyFor(FieldName.Refills),
      decision,
      confirmationMode: ConfirmationMode.Validator,
      callerConfirmed: false,
    })

    const order = setField(emptyOrder({ orderId: "o1", sessionId: "s1" }), value)
    expect(order.fields.get(FieldName.Refills)?.value).toBe(2)
  })
})
