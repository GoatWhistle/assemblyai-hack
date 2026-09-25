import {
  ConfirmationMode,
  ConfirmationReason,
  FieldName,
  type OrderReceipt,
  type ReceiptCheck,
  type ReceiptField,
  type ReceiptRecheck,
  receiptDigestVerdict,
  VerdictOutcome,
} from "@/domain"
import { lasaRiskFor } from "@/lasa"
import { validateDea, validateNpi } from "@/validators"

export type DigestWording = {
  readonly valid: string
  readonly tampered: string
}

export type ExtraFieldChecks = (field: ReceiptField) => readonly ReceiptCheck[]

const SPOKEN_MODES: readonly string[] = [ConfirmationMode.ReadBack, ConfirmationMode.SpellOut]

function checksumCheck(field: ReceiptField, value: string): ReceiptCheck[] {
  if (field.field === FieldName.PrescriberNpi) {
    const verdict = validateNpi(value)
    const passed = verdict.outcome === VerdictOutcome.Passed
    return [{ field: field.field, check: "npi_luhn", passed, detail: verdict.detail }]
  }
  if (field.field === FieldName.PrescriberDea) {
    const verdict = validateDea(value)
    const passed = verdict.outcome === VerdictOutcome.Passed
    return [{ field: field.field, check: "dea_checksum", passed, detail: verdict.detail }]
  }
  return []
}

function pairCheck(field: ReceiptField, value: string): ReceiptCheck[] {
  if (field.field !== FieldName.DrugName) {
    return []
  }
  const risk = lasaRiskFor(value)
  if (!risk.hit) {
    return []
  }
  const aloud =
    SPOKEN_MODES.includes(field.confirmationMode) &&
    field.confirmation?.verdict === "confirmed" &&
    field.confirmation.reasonCode === ConfirmationReason.CallerNamedValue
  const partners = risk.confusableWith.join(", ")
  return [
    {
      field: field.field,
      check: "lasa_confirmed_aloud",
      passed: aloud,
      detail: aloud
        ? `${value} is in a published sound-alike pair with ${partners} and the caller said its name`
        : `${value} is in a published sound-alike pair with ${partners} but carries no confirmation in which the caller said its name`,
    },
  ]
}

export function receiptFieldChecks(field: ReceiptField): readonly ReceiptCheck[] {
  const value = String(field.value)
  return [...checksumCheck(field, value), ...pairCheck(field, value)]
}

export async function recheckReceiptProof(
  receipt: OrderReceipt,
  input: { wording: DigestWording; extra?: ExtraFieldChecks },
): Promise<ReceiptRecheck> {
  const digest = await receiptDigestVerdict(receipt)
  const checks: ReceiptCheck[] = [
    {
      field: "*",
      check: "digest",
      passed: digest === "VALID",
      detail: digest === "VALID" ? input.wording.valid : input.wording.tampered,
    },
  ]
  for (const field of Array.isArray(receipt.fields) ? receipt.fields : []) {
    checks.push(...receiptFieldChecks(field), ...(input.extra?.(field) ?? []))
  }
  return {
    verdict: checks.every((check) => check.passed) ? "VALID" : "TAMPERED",
    checks,
  }
}
