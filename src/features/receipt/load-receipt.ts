import {
  NO_RECEIPT_CODE,
  type OrderReceipt,
  type ReceiptCheck,
  type ReceiptRecheck,
} from "@/domain"
import { parseReceipt } from "./verify-receipt"

export type ReceiptLoad =
  | { readonly state: "loading" }
  | { readonly state: "missing"; readonly message: string }
  | { readonly state: "failed"; readonly status: number | null; readonly message: string }
  | {
      readonly state: "loaded"
      readonly receipt: OrderReceipt
      readonly fhir: unknown
      readonly serverRecheck: ReceiptRecheck | null
    }

export function receiptRoute(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/receipt`
}

function recheckOf(value: unknown): ReceiptRecheck | null {
  if (typeof value !== "object" || value === null) {
    return null
  }
  const record = value as Record<string, unknown>
  if (
    (record.verdict !== "VALID" && record.verdict !== "TAMPERED") ||
    !Array.isArray(record.checks)
  ) {
    return null
  }
  return { verdict: record.verdict, checks: record.checks as ReceiptCheck[] }
}

export function sentence(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return trimmed
  }
  const capital = `${trimmed[0]?.toUpperCase() ?? ""}${trimmed.slice(1)}`
  return /[.!?]$/.test(capital) ? capital : `${capital}.`
}

export async function loadReceipt(sessionId: string): Promise<ReceiptLoad> {
  let response: Response
  try {
    response = await fetch(receiptRoute(sessionId), { cache: "no-store" })
  } catch {
    return { state: "failed", status: null, message: "The receipt could not be fetched." }
  }
  const text = await response.text()
  let body: Record<string, unknown> = {}
  try {
    body = JSON.parse(text) as Record<string, unknown>
  } catch {
    body = {}
  }
  if (!response.ok) {
    const message = sentence(
      typeof body.error === "string"
        ? body.error
        : `the server answered HTTP ${response.status}`,
    )
    return body.code === NO_RECEIPT_CODE
      ? { state: "missing", message }
      : { state: "failed", status: response.status, message }
  }
  const receipt = parseReceipt(text)
  if (receipt === null) {
    return {
      state: "failed",
      status: response.status,
      message: "The server answered with something that is not a receipt.",
    }
  }
  return {
    state: "loaded",
    receipt,
    fhir: body.fhir ?? null,
    serverRecheck: recheckOf(body.recheck),
  }
}
