import { recheckReceiptProof } from "@/confirmation"
import type { OrderReceipt, ReceiptRecheck } from "@/domain"

export async function verifyReceiptInBrowser(receipt: OrderReceipt): Promise<ReceiptRecheck> {
  return recheckReceiptProof(receipt, {
    wording: {
      valid: "the sha256 recomputed here matches the one the receipt carries",
      tampered: "the sha256 recomputed here does not match the one the receipt carries",
    },
  })
}

export function parseReceipt(text: string): OrderReceipt | null {
  try {
    const parsed = JSON.parse(text) as unknown
    if (typeof parsed !== "object" || parsed === null) {
      return null
    }
    const candidate = (parsed as { receipt?: unknown }).receipt ?? parsed
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      typeof (candidate as { orderId?: unknown }).orderId === "string" &&
      Array.isArray((candidate as { fields?: unknown }).fields)
    ) {
      return candidate as OrderReceipt
    }
    return null
  } catch {
    return null
  }
}
