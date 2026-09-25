import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  ConfirmationMode,
  ConfirmationReason,
  FieldName,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  ORDER_RECEIPT_SCHEMA_VERSION,
  type OrderWitness,
  type ReceiptField,
  sealReceipt,
  VerdictOutcome,
  WITNESS_BOUNDARY_NOTE,
} from "@/domain"
import { useLiveOrder } from "@/features/intake/use-live-order"
import type { LiveOrderSnapshot } from "@/features/order-summary/live-snapshot"
import { groupOrder } from "@/features/order-summary/order-groups"
import { OrderPanel } from "@/features/order-summary/order-panel"
import { OrderCheck } from "@/features/receipt/order-check"
import {
  readOrderWitness,
  WITNESS_LABEL,
  WitnessBadge,
  witnessVerdictFor,
} from "@/features/receipt/witness-badge"

const WITNESS: OrderWitness = {
  source: "GET https://agents.assemblyai.com/v1/sessions",
  checkedAt: "2026-09-25T10:05:00.000Z",
  vendorSessionIds: ["vs-1"],
  vendorUserTurnCount: 4,
  unavailableReason: null,
  fields: [
    {
      field: FieldName.DrugName,
      verdict: "witnessed",
      vendorTranscript: "Hydromorphone.",
      detail: "the vendor transcript carries the value",
    },
    {
      field: FieldName.Sig,
      verdict: "not_witnessed",
      vendorTranscript: null,
      detail: "no vendor turn supports the value",
    },
  ],
}

const UNAVAILABLE: OrderWitness = {
  ...WITNESS,
  vendorSessionIds: [],
  vendorUserTurnCount: 0,
  unavailableReason: "no key on the server",
  fields: [],
}

function receiptField(field: FieldName, value: string): ReceiptField {
  return {
    field,
    value,
    candidateId: `cand-${field}`,
    confirmationMode: ConfirmationMode.ReadBack,
    provenance: makeProvenance({
      words: [makeWordSpan({ text: value, startMs: 2000, endMs: 2600, confidence: 1 })],
      turnOrder: 1,
      transcriptSlice: value,
      sessionId: "srv-9",
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "ndc_catalog",
      detail: "fixture",
      checkedValue: value,
    }),
    confirmation: null,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("the vendor witness verdict is shown per field, quietly", () => {
  it("names each verdict in plain words", () => {
    for (const [verdict, label] of [
      ["witnessed", "heard by AssemblyAI too"],
      ["not_witnessed", "not in the vendor's transcript"],
      ["unavailable", "vendor record unavailable"],
    ] as const) {
      expect(WITNESS_LABEL[verdict]).toBe(label)
    }
  })

  it("renders the field's own verdict, and nothing when no witness was recorded", () => {
    const { rerender } = render(<WitnessBadge witness={WITNESS} field={FieldName.DrugName} />)
    expect(screen.getByText("heard by AssemblyAI too")).toBeTruthy()
    rerender(<WitnessBadge witness={WITNESS} field={FieldName.Sig} />)
    expect(screen.getByText("not in the vendor's transcript")).toBeTruthy()
    rerender(<WitnessBadge witness={null} field={FieldName.DrugName} />)
    expect(screen.queryByText(/AssemblyAI|vendor/)).toBeNull()
  })

  it("reads an unavailable vendor record as unavailable for every field, never as witnessed", () => {
    expect(witnessVerdictFor(UNAVAILABLE, FieldName.DrugName)).toBe("unavailable")
    expect(witnessVerdictFor(WITNESS, FieldName.Quantity)).toBeNull()
  })

  it("refuses a malformed witness instead of rendering a guess", () => {
    expect(readOrderWitness(undefined)).toBeNull()
    expect(readOrderWitness({ fields: "all" })).toBeNull()
    expect(
      readOrderWitness({ ...WITNESS, fields: [{ field: "drug_name", verdict: "sure" }] }),
    ).toBeNull()
    expect(readOrderWitness(WITNESS)).toEqual(WITNESS)
  })
})

describe("the witness reaches /order/[id] and the order summary", () => {
  it("shows the verdict beside each receipt field and keeps the digest VALID", async () => {
    const receipt = await sealReceipt({
      schemaVersion: ORDER_RECEIPT_SCHEMA_VERSION,
      orderId: "order-abc123",
      sessionId: "srv-9",
      fields: [receiptField(FieldName.Sig, "one tablet at night")],
      actualModel: "universal-3-5-pro",
      origin: "live",
      committedAt: "2026-09-27T10:00:00.000Z",
      witness: WITNESS,
    })
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ receipt, fhir: null })),
    ) as unknown as typeof fetch
    render(<OrderCheck sessionId="srv-9" />)
    await waitFor(() => expect(screen.getByText("VALID")).toBeTruthy())
    expect(screen.getByRole("columnheader", { name: "Vendor transcript" })).toBeTruthy()
    const row = screen.getByRole("row", { name: /one tablet at night/ })
    expect(within(row).getByText("not in the vendor's transcript")).toBeTruthy()
    expect(screen.getByText(`${WITNESS_BOUNDARY_NOTE}.`)).toBeTruthy()
  })

  it("puts the badge on a confirmed row of the order summary", () => {
    const snapshot: LiveOrderSnapshot = {
      orderId: "ord-7f3a",
      referenceNumber: "7F3A2C",
      status: "in_progress",
      confirmedFields: [FieldName.DrugName],
      abortedFields: [],
      confirmations: [
        {
          field: FieldName.DrugName,
          candidateId: "cand-drug_name",
          readBack: null,
          callerTurn: { turnOrder: 2, transcript: "Hydromorphone.", words: [] },
          verdict: "confirmed",
          reasonCode: ConfirmationReason.CallerNamedValue,
          callerAnswerHint: null,
        },
      ],
      commitRefusals: [],
      awaitingConfirmation: null,
      actualModel: "universal-3-5-pro",
    }
    const groups = groupOrder({ candidates: [], decisions: new Map(), snapshot })
    render(<OrderPanel groups={groups} snapshot={snapshot} witness={WITNESS} />)
    expect(screen.getByText("heard by AssemblyAI too")).toBeTruthy()
  })

  it("takes the witness from the finalize response, the path the product calls", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ sessionId: "srv-9", witness: WITNESS })),
    ) as unknown as typeof fetch
    const { result } = renderHook(() => useLiveOrder())
    await act(async () => {
      await result.current.finalize("srv-9")
    })
    expect(result.current.witness).toEqual(WITNESS)
  })
})
