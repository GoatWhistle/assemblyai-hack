#!/usr/bin/env -S npx tsx

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { type CatalogIndex, loadCatalogFrom } from "@/catalog"
import { type OrderReceipt, RECEIPT_CANONICAL_RULE, type ReceiptRecheck } from "@/domain"
import { recheckReceipt } from "@/sessions"

const DEFAULT_CATALOG_PATH = "data/catalog.json"

function receiptFromJson(raw: unknown): OrderReceipt | null {
  if (typeof raw !== "object" || raw === null) {
    return null
  }
  const wrapped = (raw as { receipt?: unknown }).receipt
  const candidate = (wrapped ?? raw) as Partial<OrderReceipt>
  if (typeof candidate.sha256 !== "string" || !Array.isArray(candidate.fields)) {
    return null
  }
  return candidate as OrderReceipt
}

function catalogOrNull(path: string): CatalogIndex | null {
  try {
    return loadCatalogFrom(path)
  } catch {
    return null
  }
}

function formatRecheck(recheck: ReceiptRecheck, catalogLoaded: boolean): string {
  const lines = [`verdict: ${recheck.verdict}`]
  for (const check of recheck.checks) {
    lines.push(
      `  ${check.passed ? "pass" : "FAIL"} ${check.check} ${check.field}: ${check.detail}`,
    )
  }
  if (!catalogLoaded) {
    lines.push(
      `  note: no catalogue at ${DEFAULT_CATALOG_PATH}; the catalogue check did not run`,
    )
  }
  lines.push(`  rule: ${RECEIPT_CANONICAL_RULE}`)
  return lines.join("\n")
}

export async function verifyReceiptFile(
  path: string,
  catalogPath = DEFAULT_CATALOG_PATH,
): Promise<{ recheck: ReceiptRecheck | null; text: string }> {
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(resolve(path), "utf8"))
  } catch {
    return { recheck: null, text: `verdict: TAMPERED\n  ${path} is not readable JSON` }
  }
  const receipt = receiptFromJson(parsed)
  if (receipt === null) {
    return {
      recheck: null,
      text: `verdict: TAMPERED\n  ${path} has no receipt with fields and sha256`,
    }
  }
  const catalog = catalogOrNull(catalogPath)
  const recheck = await recheckReceipt(receipt, catalog)
  return { recheck, text: formatRecheck(recheck, catalog !== null) }
}

async function main(): Promise<void> {
  const path = process.argv[2]
  if (path === undefined) {
    console.error("usage: npm run verify-receipt <receipt.json>")
    process.exit(2)
    return
  }
  const { recheck, text } = await verifyReceiptFile(path)
  console.log(text)
  process.exit(recheck?.verdict === "VALID" ? 0 : 1)
}

if (process.argv[1] !== undefined && resolve(process.argv[1]).endsWith("verify-receipt.ts")) {
  void main()
}
