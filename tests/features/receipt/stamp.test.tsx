import { readFileSync } from "node:fs"
import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  ConfirmationMode,
  FieldName,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  ORDER_RECEIPT_SCHEMA_VERSION,
  type OrderReceipt,
  sealReceipt,
  VerdictOutcome,
} from "@/domain"
import { ReceiptView } from "@/features/receipt/receipt-view"

function sealed(): Promise<OrderReceipt> {
  const value = "1234567893"
  return sealReceipt({
    schemaVersion: ORDER_RECEIPT_SCHEMA_VERSION,
    orderId: "order-stamp",
    sessionId: "srv-stamp",
    fields: [
      {
        field: FieldName.PrescriberNpi,
        value,
        candidateId: "cand-npi",
        confirmationMode: ConfirmationMode.Validator,
        provenance: makeProvenance({
          words: [makeWordSpan({ text: value, startMs: 2000, endMs: 2600, confidence: 1 })],
          turnOrder: 1,
          transcriptSlice: value,
          sessionId: "srv-stamp",
          sttTurnIsFormatted: true,
        }),
        verdict: makeVerdict({
          outcome: VerdictOutcome.Passed,
          validatorName: "npi_luhn",
          detail: "fixture",
          checkedValue: value,
        }),
        confirmation: null,
      },
    ],
    actualModel: "universal-3-5-pro",
    origin: "live",
    committedAt: "2026-09-27T10:00:00.000Z",
  })
}

describe("the receipt check lands as a stamp", () => {
  it("shows CHECKING as a pending mark, then stamps the browser's own verdict", async () => {
    render(
      <ReceiptView receipt={await sealed()} fhir={null} serverRecheck={null} source="server" />,
    )
    const pending = screen.getByText("CHECKING")
    expect(pending.className).toMatch(/pending/)
    const stamp = await waitFor(() => screen.getByText("VALID"))
    expect(stamp.className).toMatch(/stamped/)
    expect(stamp.className).not.toMatch(/pending/)
  })

  it("keeps the stamp still on paper and times it from a collapsing token", () => {
    const sheet = readFileSync("src/features/receipt/receipt-view/styles.module.css", "utf8")
    const print = sheet.slice(sheet.indexOf("@media print"))
    expect(print).toMatch(/\.stamped,\s*\.checks tbody tr\s*\{\s*animation: none;/)
    expect(sheet).toMatch(/animation: stamp var\(--dur-slow\)/)
  })
})
