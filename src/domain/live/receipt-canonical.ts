import type { OrderReceipt } from "./live-contract"

export type ReceiptVerdict = "VALID" | "TAMPERED"

export const RECEIPT_CANONICAL_RULE =
  "the receipt without its sha256 field, serialised as JSON with object keys sorted by UTF-16 code unit at every depth, arrays in their given order, no whitespace, and undefined members omitted; the digest is SHA-256 over the UTF-8 bytes of that string, written as 64 lowercase hex characters"

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : canonicalValue(item)))
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const member = (value as Record<string, unknown>)[key]
      if (member !== undefined) {
        sorted[key] = canonicalValue(member)
      }
    }
    return sorted
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    return null
  }
  return value
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value))
}

export type UnsignedReceipt = Omit<OrderReceipt, "sha256">

export function receiptWithoutDigest(receipt: OrderReceipt | UnsignedReceipt): UnsignedReceipt {
  const { sha256: _digest, ...rest } = receipt as OrderReceipt
  return rest
}

export function canonicalReceiptJson(receipt: OrderReceipt | UnsignedReceipt): string {
  return canonicalJson(receiptWithoutDigest(receipt))
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function receiptDigest(receipt: OrderReceipt | UnsignedReceipt): Promise<string> {
  return sha256Hex(canonicalReceiptJson(receipt))
}

export async function sealReceipt(receipt: UnsignedReceipt): Promise<OrderReceipt> {
  return { ...receipt, sha256: await receiptDigest(receipt) }
}

export async function receiptDigestVerdict(receipt: OrderReceipt): Promise<ReceiptVerdict> {
  if (typeof receipt.sha256 !== "string") {
    return "TAMPERED"
  }
  return (await receiptDigest(receipt)) === receipt.sha256.toLowerCase() ? "VALID" : "TAMPERED"
}

export type ReceiptCheckName =
  | "digest"
  | "npi_luhn"
  | "dea_checksum"
  | "lasa_confirmed_aloud"
  | "catalog"

export type ReceiptCheck = {
  readonly field: string
  readonly check: ReceiptCheckName
  readonly passed: boolean
  readonly detail: string
}

export type ReceiptRecheck = {
  readonly verdict: ReceiptVerdict
  readonly checks: readonly ReceiptCheck[]
}
