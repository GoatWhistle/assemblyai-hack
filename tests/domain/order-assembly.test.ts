import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  ConfirmationMode,
  emptyOrder,
  FieldName,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  policyFor,
  setField,
  VerdictOutcome,
  withdrawField,
} from "@/domain"
import { confirm, decide } from "@/gate"

const ROOT = join(__dirname, "..", "..")

function sourceOf(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8")
}

describe("the order is assembled from confirmed fields, never from the model's prose", () => {
  it("has exactly one place that writes Order.fields in src, and it takes a ConfirmedValue", () => {
    const orderSource = sourceOf("src/domain/order.ts")
    const setFieldCalls = [...orderSource.matchAll(/setField\(/g)].length
    expect(
      setFieldCalls,
      "setField should be declared once (its export) in order.ts; a second definition would be a second write path",
    ).toBe(1)

    const intakeSource = sourceOf("src/tools/intake.ts")
    expect(
      intakeSource.includes("state.order = setField(state.order, value)"),
      "writeConfirmed must call setField with a ConfirmedValue, and this is the only place src/tools may do it",
    ).toBe(true)
  })

  it("proves confirm() builds a ConfirmedValue only from candidate.normalizedValue, never from free text", () => {
    const confirmSource = sourceOf("src/gate/confirm.ts")
    expect(
      confirmSource.includes("value: candidate.normalizedValue"),
      "the field written into ConfirmedValue.value must come from the candidate the gate proved, not from an argument named utterance or transcript",
    ).toBe(true)
    expect(
      confirmSource.match(/utterance/i),
      "confirm() takes no utterance text at all; read-back prose reaching this function would mean the order can be swayed by what the model said, not by what it proved",
    ).toBeNull()
  })

  it("commitOrder assembles fields.<name>.value from ConfirmedValue.value, and full_order_read_back is inert", () => {
    const commitSource = sourceOf("app/api/tools/commit-order/route.ts")
    expect(commitSource.includes("value: value.value,")).toBe(true)
    expect(
      commitSource.includes("state.order.fields.set") ||
        commitSource.includes("order.fields.set"),
      "commit-order must never write into order.fields itself; it only reads what earlier confirmations already wrote",
    ).toBe(false)

    const readBackAssignments = [...commitSource.matchAll(/full_order_read_back/g)]
    for (const match of readBackAssignments) {
      const around = commitSource.slice(
        Math.max(0, match.index ?? 0) - 40,
        (match.index ?? 0) + 60,
      )
      expect(
        around.includes("state.order.fields") || around.includes("setField("),
        `full_order_read_back must never sit next to a field write; found near: ${around}`,
      ).toBe(false)
    }
  })

  it("end-to-end: a candidate proved by the gate produces the field value, and a decoy value mentioned only in prose never enters the order", () => {
    const words = [
      makeWordSpan({ text: "lisinopril", startMs: 100, endMs: 700, confidence: 0.99 }),
    ]
    const provenance = makeProvenance({
      words,
      turnOrder: 1,
      transcriptSlice: "lisinopril",
      sessionId: "order-assembly-session",
    })
    const verdict = makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "ndc_catalog",
      detail: "lisinopril resolves in the built catalogue",
      checkedValue: "lisinopril",
    })
    const candidate = makeCandidate({
      candidateId: "candidate-order-assembly",
      field: FieldName.DrugName,
      rawValue: "lisinopril",
      normalizedValue: "lisinopril",
      provenance,
      verdict,
      attempt: 1,
    })
    const policy = policyFor(FieldName.DrugName)
    const decision = decide(candidate, policy)

    const value = confirm({
      candidate,
      policy,
      decision,
      confirmationMode: ConfirmationMode.ReadBack,
      callerConfirmed: true,
    })

    let order = emptyOrder({ orderId: "order-test", sessionId: "order-assembly-session" })
    order = setField(order, value)

    const written = order.fields.get(FieldName.DrugName)
    expect(
      written?.value,
      "the field must carry the value the gate actually proved, sourced from the candidate, not from any prose an agent might compose elsewhere in the same turn (e.g. a read-back sentence mentioning a different drug as an example)",
    ).toBe("lisinopril")
  })
})

describe("withdrawField: a revision removes currency without touching ConfirmedValue construction", () => {
  it("removes a set field from order.fields and leaves an unset field untouched", () => {
    const words = [makeWordSpan({ text: "thirty", startMs: 0, endMs: 400, confidence: 0.99 })]
    const provenance = makeProvenance({
      words,
      turnOrder: 1,
      transcriptSlice: "thirty",
      sessionId: "withdraw-session",
    })
    const verdict = makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "range_check",
      detail: "within range",
      checkedValue: "30",
    })
    const candidate = makeCandidate({
      candidateId: "candidate-withdraw",
      field: FieldName.Quantity,
      rawValue: "thirty",
      normalizedValue: 30,
      provenance,
      verdict,
      attempt: 1,
    })
    const policy = policyFor(FieldName.Quantity)
    const decision = decide(candidate, policy)
    const value = confirm({
      candidate,
      policy,
      decision,
      confirmationMode: ConfirmationMode.ReadBack,
      callerConfirmed: true,
    })

    let order = emptyOrder({ orderId: "order-withdraw", sessionId: "withdraw-session" })
    order = setField(order, value)
    expect(order.fields.has(FieldName.Quantity)).toBe(true)

    order = withdrawField(order, FieldName.Quantity)
    expect(
      order.fields.has(FieldName.Quantity),
      "withdrawField must remove the field entirely rather than mutating the frozen ConfirmedValue in place",
    ).toBe(false)

    const untouched = withdrawField(order, FieldName.DrugName)
    expect(
      untouched,
      "withdrawing a field that was never set must be a no-op, not an error, so callers can withdraw unconditionally on every new proposal",
    ).toBe(order)
  })

  it("never constructs a ConfirmedValue, so it carries no assertion the gate invariant would need to allow", () => {
    const orderSource = readFileSync(join(ROOT, "src/domain/order.ts"), "utf8")
    const withdrawBlock = orderSource.slice(
      orderSource.indexOf("export function withdrawField"),
    )
    const brandAssertion = ["as", "ConfirmedValue"].join(" ")
    expect(withdrawBlock.includes(brandAssertion)).toBe(false)
  })
})
