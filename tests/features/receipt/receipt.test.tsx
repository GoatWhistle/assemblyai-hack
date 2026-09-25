import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { receiptFieldChecks } from "@/confirmation"
import {
  type ConfirmationEvidence,
  ConfirmationMode,
  ConfirmationReason,
  FieldName,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  NO_RECEIPT_CODE,
  ORDER_RECEIPT_SCHEMA_VERSION,
  type OrderReceipt,
  type ReceiptField,
  sealReceipt,
  VerdictOutcome,
} from "@/domain"
import { OrderCheck } from "@/features/receipt/order-check"
import { verifyReceiptInBrowser } from "@/features/receipt/verify-receipt"

function field(
  name: FieldName,
  value: string,
  mode: ConfirmationMode,
  confirmation: ConfirmationEvidence | null = null,
): ReceiptField {
  return {
    field: name,
    value,
    candidateId: `cand-${name}`,
    confirmationMode: mode,
    provenance: makeProvenance({
      words: [makeWordSpan({ text: value, startMs: 2000, endMs: 2600, confidence: 1 })],
      turnOrder: 1,
      transcriptSlice: value,
      sessionId: "srv-9",
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: name === FieldName.PrescriberNpi ? "npi_luhn" : "ndc_catalog",
      detail: "fixture",
      checkedValue: value,
    }),
    confirmation,
  }
}

const CONFIRMED: ConfirmationEvidence = {
  field: FieldName.DrugName,
  candidateId: "cand-drug_name",
  readBack: {
    replyId: "r",
    text: "Hydromorphone?",
    completed: true,
    playedMs: 900,
    durationMs: 900,
  },
  callerTurn: { turnOrder: 2, transcript: "Hydromorphone.", words: [] },
  verdict: "confirmed",
  reasonCode: ConfirmationReason.CallerNamedValue,
  callerAnswerHint: null,
}

const REFLEX_YES: ConfirmationEvidence = {
  ...CONFIRMED,
  callerTurn: { turnOrder: 2, transcript: "Yes.", words: [] },
  reasonCode: ConfirmationReason.CallerAffirmed,
  callerAnswerHint: "yes",
}

async function receiptWith(fields: readonly ReceiptField[]): Promise<OrderReceipt> {
  return sealReceipt({
    schemaVersion: ORDER_RECEIPT_SCHEMA_VERSION,
    orderId: "order-abc123",
    sessionId: "srv-9",
    fields,
    actualModel: "universal-3-5-pro",
    origin: "live",
    committedAt: "2026-09-27T10:00:00.000Z",
  })
}

const GOOD = [
  field(FieldName.DrugName, "hydromorphone", ConfirmationMode.ReadBack, CONFIRMED),
  field(FieldName.PrescriberNpi, "1234567893", ConfirmationMode.Validator),
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe("U7: the browser recomputes the receipt's proof itself", () => {
  it("reads a sealed receipt as VALID", async () => {
    expect((await verifyReceiptInBrowser(await receiptWith(GOOD))).verdict).toBe("VALID")
  })

  it("reads one changed character as TAMPERED", async () => {
    const receipt = await receiptWith(GOOD)
    const edited = JSON.parse(JSON.stringify(receipt).replace("1234567893", "1234567894"))
    const verification = await verifyReceiptInBrowser(edited)
    expect(verification.verdict).toBe("TAMPERED")
    expect(verification.checks.find((entry) => entry.check === "digest")?.passed).toBe(false)
  })

  it("fails a resealed receipt whose NPI or look-alike proof does not hold", async () => {
    const forged = await receiptWith([
      field(FieldName.DrugName, "hydromorphone", ConfirmationMode.Validator),
      field(FieldName.PrescriberNpi, "1234567890", ConfirmationMode.Validator),
    ])
    const verification = await verifyReceiptInBrowser(forged)
    expect(verification.verdict).toBe("TAMPERED")
    const failed = verification.checks
      .filter((entry) => !entry.passed)
      .map((entry) => entry.check)
      .sort()
    expect(failed).toEqual(["lasa_confirmed_aloud", "npi_luhn"])
  })

  it("S0: fails a listed drug confirmed by a yes rather than by its name", async () => {
    const yes = await receiptWith([
      field(FieldName.DrugName, "hydromorphone", ConfirmationMode.ReadBack, REFLEX_YES),
      field(FieldName.PrescriberNpi, "1234567893", ConfirmationMode.Validator),
    ])
    const verification = await verifyReceiptInBrowser(yes)
    expect(verification.verdict).toBe("TAMPERED")
    expect(
      verification.checks.filter((entry) => !entry.passed).map((entry) => entry.check),
    ).toEqual(["lasa_confirmed_aloud"])
  })

  it("adds nothing to the shared recheck but its own digest wording", async () => {
    const receipt = await receiptWith([
      field(FieldName.DrugName, "hydromorphone", ConfirmationMode.ReadBack, REFLEX_YES),
      field(FieldName.PrescriberNpi, "1234567890", ConfirmationMode.Validator),
    ])
    const browser = await verifyReceiptInBrowser(receipt)
    expect(browser.checks.slice(1)).toEqual(receipt.fields.flatMap(receiptFieldChecks))
    expect(browser.checks.map((entry) => entry.check)).toEqual([
      "digest",
      "lasa_confirmed_aloud",
      "npi_luhn",
    ])
  })
})

describe("U7: /order/[id] loads the receipt and says VALID or TAMPERED", () => {
  it("fetches the session's receipt and shows the browser's verdict", async () => {
    const receipt = await receiptWith(GOOD)
    const fetcher = vi.fn(
      async (_url: string) =>
        new Response(JSON.stringify({ receipt, fhir: { resourceType: "Bundle" } })),
    )
    globalThis.fetch = fetcher as unknown as typeof fetch
    render(<OrderCheck sessionId="srv-9" />)
    await waitFor(() => expect(screen.getByText("VALID")).toBeTruthy())
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/sessions/srv-9/receipt")
    expect(screen.getByRole("button", { name: "Download receipt" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Download FHIR JSON" })).toBeTruthy()
  })

  it("says there is no receipt rather than showing an empty one", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "no committed order", code: NO_RECEIPT_CODE }), {
          status: 404,
        }),
    ) as unknown as typeof fetch
    render(<OrderCheck sessionId="srv-0" />)
    await waitFor(() => expect(screen.getByText("No receipt for this session")).toBeTruthy())
  })

  it("rechecks an edited file and reads it TAMPERED", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ code: NO_RECEIPT_CODE, error: "none" }), { status: 404 }),
    ) as unknown as typeof fetch
    render(<OrderCheck sessionId="srv-9" />)
    const text = JSON.stringify(await receiptWith(GOOD)).replace("hydromorphone", "morphine")
    const input = screen.getByLabelText(/check a receipt file/i)
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File([text], "receipt.json")] } })
    })
    await waitFor(() => expect(screen.getByText("TAMPERED")).toBeTruthy())
  })
})
