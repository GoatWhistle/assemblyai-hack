import { type CatalogIndex, findDrug } from "@/catalog"
import { recheckReceiptProof } from "@/confirmation"
import {
  type ConfirmationEvidence,
  type ConfirmedValue,
  FieldName,
  ORDER_RECEIPT_SCHEMA_VERSION,
  type OrderReceipt,
  type ReceiptCheck,
  type ReceiptField,
  type ReceiptRecheck,
  sealReceipt,
} from "@/domain"

export async function buildReceipt(input: {
  orderId: string
  sessionId: string
  fields: readonly ConfirmedValue[]
  confirmations: ReadonlyMap<FieldName, ConfirmationEvidence>
  actualModel: string | null
  origin: string
  committedAt: string
}): Promise<OrderReceipt> {
  const fields: ReceiptField[] = [...input.fields]
    .sort((a, b) => a.field.localeCompare(b.field))
    .map((value) => ({
      field: value.field,
      value: value.value,
      candidateId: value.candidateId,
      confirmationMode: value.confirmationMode,
      provenance: value.provenance,
      verdict: value.verdict,
      confirmation: input.confirmations.get(value.field) ?? null,
    }))
  return sealReceipt({
    schemaVersion: ORDER_RECEIPT_SCHEMA_VERSION,
    orderId: input.orderId,
    sessionId: input.sessionId,
    fields,
    actualModel: input.actualModel,
    origin: input.origin,
    committedAt: input.committedAt,
  })
}

function catalogCheck(catalog: CatalogIndex | null) {
  return (field: ReceiptField): readonly ReceiptCheck[] => {
    if (catalog === null || field.field !== FieldName.DrugName) {
      return []
    }
    const value = String(field.value)
    const found = findDrug(catalog, value) !== null
    return [
      {
        field: field.field,
        check: "catalog",
        passed: found,
        detail: found
          ? `${value} exists in the built catalogue`
          : `${value} is not in the catalogue`,
      },
    ]
  }
}

export async function recheckReceipt(
  receipt: OrderReceipt,
  catalog: CatalogIndex | null,
): Promise<ReceiptRecheck> {
  return recheckReceiptProof(receipt, {
    wording: {
      valid: "the sha256 matches the canonical JSON of the receipt",
      tampered: "the sha256 does not match the canonical JSON of the receipt",
    },
    extra: catalogCheck(catalog),
  })
}
