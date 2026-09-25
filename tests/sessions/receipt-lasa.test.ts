import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  type ConfirmationEvidence,
  ConfirmationMode,
  ConfirmationReason,
  FieldName,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  ORDER_RECEIPT_SCHEMA_VERSION,
  type OrderReceipt,
  type ReceiptField,
  sealReceipt,
  VerdictOutcome,
} from "@/domain"
import { recheckReceipt } from "@/sessions"

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

const NAMED: ConfirmationEvidence = {
  field: FieldName.DrugName,
  candidateId: "cand-drug_name",
  readBack: {
    replyId: "r",
    text: "hydromorphone and morphine are on a published confused-drug-names list. Which: hydromorphone, H-Y-D-R-O, or morphine? Answer with a name.",
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
  ...NAMED,
  callerTurn: { turnOrder: 2, transcript: "Yes.", words: [] },
  reasonCode: ConfirmationReason.CallerAffirmed,
  callerAnswerHint: "yes",
}

const NPI = field(FieldName.PrescriberNpi, "1234567893", ConfirmationMode.Validator)

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

async function failedChecks(receipt: OrderReceipt): Promise<readonly string[]> {
  return (await recheckReceipt(receipt, null)).checks
    .filter((entry) => !entry.passed)
    .map((entry) => entry.check)
}

describe("S0 receipt parity: the server recheck asks for the caller's own word, as the browser does", () => {
  it("reads a listed drug the caller named as VALID", async () => {
    const receipt = await receiptWith([
      field(FieldName.DrugName, "hydromorphone", ConfirmationMode.ReadBack, NAMED),
      NPI,
    ])
    expect((await recheckReceipt(receipt, null)).verdict).toBe("VALID")
    expect(await failedChecks(receipt)).toEqual([])
  })

  it("S0: fails a listed drug confirmed by a yes rather than by its name", async () => {
    const receipt = await receiptWith([
      field(FieldName.DrugName, "hydromorphone", ConfirmationMode.ReadBack, REFLEX_YES),
      NPI,
    ])
    expect((await recheckReceipt(receipt, null)).verdict).toBe("TAMPERED")
    expect(await failedChecks(receipt)).toEqual(["lasa_confirmed_aloud"])
  })

  it("reads the partner the caller corrected to as VALID, since read_back writes it as a named value", async () => {
    const receipt = await receiptWith([
      field(FieldName.DrugName, "morphine", ConfirmationMode.ReadBack, {
        ...NAMED,
        candidateId: "cand-drug_name-named-partner",
        callerTurn: { turnOrder: 2, transcript: "Morphine.", words: [] },
      }),
      NPI,
    ])
    expect(await failedChecks(receipt)).toEqual([])
  })

  it("fails a listed drug whose named confirmation came through no spoken mode", async () => {
    const receipt = await receiptWith([
      field(FieldName.DrugName, "hydromorphone", ConfirmationMode.Validator, NAMED),
      NPI,
    ])
    expect(await failedChecks(receipt)).toEqual(["lasa_confirmed_aloud"])
  })

  it("runs the one recheck the browser runs, adding only the catalogue check", () => {
    const server = readFileSync("src/sessions/receipt/receipt.ts", "utf8")
    const browser = readFileSync("src/features/receipt/verify-receipt.ts", "utf8")
    for (const source of [server, browser]) {
      expect(source).toContain("recheckReceiptProof")
      expect(source).not.toMatch(/validateNpi|validateDea|lasaRiskFor|SPOKEN_MODES/)
    }
  })
})
