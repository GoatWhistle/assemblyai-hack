import { POST as finalizeRoute } from "@app/api/sessions/[id]/finalize/route"
import { GET as receiptRoute } from "@app/api/sessions/[id]/receipt/route"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type FieldWitness, type OrderReceipt, receiptDigestVerdict } from "@/domain"
import {
  createMemoryStore,
  installSessionStore,
  type SessionStore,
  VENDOR_SESSIONS_URL,
} from "@/sessions"
import sessionRecord from "../../eval/fixtures/witness/session-record-shape.json"
import { COMMITTED_INTAKE, commitHonestOrder } from "../api/committed-order"
import { AGENT, resetToolEnvironment, SESSION } from "../api/harness"

const TIMELINE_URL = "https://artifacts.example.com/timeline.json"
const original = globalThis.fetch
const params = (id: string) => ({ params: Promise.resolve({ id }) })

let store: SessionStore

function vendorHeard(transcripts: readonly string[]): void {
  globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    const target = String(url)
    if (init?.method === "DELETE") {
      return new Response(null, { status: 204 })
    }
    if (target.startsWith(`${VENDOR_SESSIONS_URL}?`)) {
      return Response.json({ sessions: [{ id: sessionRecord.id, agent_id: AGENT }] })
    }
    if (target.startsWith(`${VENDOR_SESSIONS_URL}/`)) {
      return Response.json({
        ...sessionRecord,
        artifacts: [{ type: "timeline", url: TIMELINE_URL, content_type: "application/json" }],
      })
    }
    if (target === TIMELINE_URL) {
      return Response.json({
        session_id: sessionRecord.id,
        turns: transcripts.map((text) => ({ user_transcript: text, status: "completed" })),
      })
    }
    return new Response(null, { status: 404 })
  }) as typeof fetch
}

async function finalize() {
  const response = await finalizeRoute(
    new Request(`https://readback.example.com/api/sessions/${SESSION}/finalize`, {
      method: "POST",
    }),
    params(SESSION),
  )
  return { status: response.status, body: await response.json() }
}

function verdicts(fields: readonly FieldWitness[] | undefined): Record<string, string> {
  return Object.fromEntries((fields ?? []).map((field) => [field.field, field.verdict]))
}

beforeEach(async () => {
  await resetToolEnvironment()
  store = createMemoryStore()
  installSessionStore(store)
  vi.stubEnv("ASSEMBLYAI_API_KEY", "a-real-looking-key")
})

afterEach(() => {
  globalThis.fetch = original
  vi.unstubAllEnvs()
  installSessionStore(null)
})

describe("S2: finalize stores a per-field vendor witness on the session and the receipt", () => {
  it("marks a browser-posted turn the vendor timeline does not contain as not_witnessed", async () => {
    await commitHonestOrder()
    const heard = COMMITTED_INTAKE.filter((input) => input.field !== "prescriber_dea")
    vendorHeard(heard.map((input) => input.value))
    const { status, body } = await finalize()
    expect(status).toBe(200)
    const stored = await store.get(SESSION)
    const byField = verdicts(stored?.witness?.fields)
    expect(byField.prescriber_dea).toBe("not_witnessed")
    expect(byField.drug_name).toBe("witnessed")
    expect(byField.prescriber_npi).toBe("witnessed")
    expect(verdicts(body.witness.fields)).toEqual(byField)
    expect(stored?.witness?.vendorSessionIds).toEqual([sessionRecord.id])
  })

  it("seals the witness into the receipt, so the digest still verifies", async () => {
    await commitHonestOrder()
    vendorHeard(COMMITTED_INTAKE.map((input) => input.value))
    await finalize()
    const response = await receiptRoute(
      new Request("https://readback.example.com/x"),
      params(SESSION),
    )
    const receipt = (await response.json()).receipt as OrderReceipt
    expect(Object.values(verdicts(receipt.witness?.fields))).toEqual(
      COMMITTED_INTAKE.map(() => "witnessed"),
    )
    expect(await receiptDigestVerdict(receipt)).toBe("VALID")
  })

  it("never blocks finalize when the vendor is unreachable: every field is unavailable, with the reason", async () => {
    await commitHonestOrder()
    globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return new Response(null, { status: 204 })
      }
      throw new TypeError("fetch failed")
    }) as typeof fetch
    const { status, body } = await finalize()
    expect(status).toBe(200)
    expect(body.committed).toBe(true)
    const stored = await store.get(SESSION)
    expect(stored?.witness?.unavailableReason).toBe(
      "the vendor could not be read: fetch failed",
    )
    expect(new Set(Object.values(verdicts(stored?.receipt?.witness?.fields)))).toEqual(
      new Set(["unavailable"]),
    )
  })
})
