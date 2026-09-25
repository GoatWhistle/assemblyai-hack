import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { POST as finalize } from "@app/api/sessions/[id]/finalize/route"
import { GET as receiptRoute } from "@app/api/sessions/[id]/receipt/route"
import { beforeEach, describe, expect, it } from "vitest"
import {
  canonicalReceiptJson,
  NO_RECEIPT_CODE,
  type OrderReceipt,
  receiptDigest,
} from "@/domain"
import { createMemoryStore, installSessionStore } from "@/sessions"
import { verifyReceiptFile } from "../../scripts/verify-receipt"
import { commitHonestOrder } from "./committed-order"
import { resetToolEnvironment, SESSION } from "./harness"

const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(async () => {
  await resetToolEnvironment()
  installSessionStore(createMemoryStore())
})

async function fetchReceipt(id = SESSION) {
  const response = await receiptRoute(new Request("https://readback.example.com/x"), params(id))
  return { status: response.status, body: await response.json() }
}

function writeTemp(value: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "readback-receipt-"))
  const file = join(dir, "receipt.json")
  writeFileSync(file, JSON.stringify(value), "utf8")
  return file
}

describe("U7: a committed order yields a sealed receipt that a changed character breaks", () => {
  it(`${NO_RECEIPT_CODE}: an uncommitted session has no receipt`, async () => {
    const { status, body } = await fetchReceipt()
    expect(status).toBe(404)
    expect(body.code).toBe(NO_RECEIPT_CODE)
  })

  it("stores the receipt at commit and serves it with the FHIR bundle and a VALID recheck", async () => {
    const committed = await commitHonestOrder()
    expect(committed.committed).toBe(true)
    const { status, body } = await fetchReceipt()
    expect(status).toBe(200)
    const receipt = body.receipt as OrderReceipt
    expect(receipt.sha256).toBe(await receiptDigest(receipt))
    expect(receipt.fields.length).toBe(8)
    expect(body.recheck.verdict).toBe("VALID")
    expect(
      body.fhir.entry.map(
        (e: { resource: { resourceType: string } }) => e.resource.resourceType,
      ),
    ).toEqual(["MedicationRequest", "Provenance"])
    const request = body.fhir.entry[0].resource
    expect(request.requester.identifier.value).toBe("1245319599")
    expect(request.status).toBe("draft")
  })

  it("keeps every committed field after finalize and adds only the sealed witness", async () => {
    await commitHonestOrder()
    const before = (await fetchReceipt()).body.receipt as OrderReceipt
    await finalize(
      new Request("https://readback.example.com/x", { method: "POST" }),
      params(SESSION),
    )
    const after = (await fetchReceipt()).body.receipt as OrderReceipt
    const { witness, sha256: _after, ...rest } = after
    const { sha256: _before, ...committed } = before
    expect(rest).toEqual(committed)
    expect(witness?.unavailableReason).toContain("no AssemblyAI key")
    expect(after.sha256).toBe(await receiptDigest(after))
  })

  it("reads TAMPERED from the CLI and from the recheck when one character of a value changes", async () => {
    await commitHonestOrder()
    const { body } = await fetchReceipt()
    const receipt = body.receipt as OrderReceipt
    const valid = await verifyReceiptFile(writeTemp(body))
    expect(valid.recheck?.verdict).toBe(body.recheck.verdict)
    expect(valid.recheck?.verdict).toBe("VALID")

    const tampered = JSON.parse(JSON.stringify(receipt))
    const quantity = tampered.fields.find((f: { field: string }) => f.field === "quantity")
    if (quantity === undefined) {
      throw new Error("the committed receipt has no quantity")
    }
    quantity.value = 80
    const cli = await verifyReceiptFile(writeTemp(tampered))
    expect(cli.recheck?.verdict).toBe("TAMPERED")
    expect(cli.text).toContain("verdict: TAMPERED")
  })

  it("reads TAMPERED when a forger recomputes the digest over a broken NPI", async () => {
    await commitHonestOrder()
    const receipt = (await fetchReceipt()).body.receipt as OrderReceipt
    const forged = JSON.parse(JSON.stringify(receipt))
    const npi = forged.fields.find((f: { field: string }) => f.field === "prescriber_npi")
    if (npi === undefined) {
      throw new Error("the committed receipt has no NPI")
    }
    npi.value = "1245319598"
    forged.sha256 = await receiptDigest(forged)
    const cli = await verifyReceiptFile(writeTemp(forged))
    expect(cli.recheck?.verdict).toBe("TAMPERED")
    expect(cli.text).toContain("FAIL npi_luhn")
  })

  it("canonicalises key order away, so a reordered file is still VALID", async () => {
    await commitHonestOrder()
    const receipt = (await fetchReceipt()).body.receipt as OrderReceipt
    const reordered = Object.fromEntries(Object.entries(receipt).reverse())
    expect(canonicalReceiptJson(reordered as OrderReceipt)).toBe(canonicalReceiptJson(receipt))
    expect((await verifyReceiptFile(writeTemp(reordered))).recheck?.verdict).toBe("VALID")
  })
})
