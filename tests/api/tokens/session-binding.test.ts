import { POST as postTurn } from "@app/api/sessions/[id]/turns/route"
import { GET as agentRoute } from "@app/api/tokens/agent/route"
import { POST as commitOrder } from "@app/api/tools/commit-order/route"
import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { catalogFromFile } from "@/catalog"
import { type AgentTokenResponse, UNKNOWN_SESSION_CODE } from "@/domain"
import { setConfirmationWait, setQuotationWait, setToolCatalog } from "@/tools"
import fixture from "../../../eval/fixtures/catalog-fixture.json"
import {
  agentTokenRequest,
  configureVendorEnv,
  freshServerState,
  stubVendor,
  VENDOR_TOOL_SECRET,
  type VendorStub,
} from "./vendor-stub"

const original = globalThis.fetch

let vendor: VendorStub

beforeEach(() => {
  configureVendorEnv()
  freshServerState()
  setToolCatalog(catalogFromFile(fixture))
  setConfirmationWait({ timeoutMs: 0, pollMs: 1 })
  setQuotationWait({ timeoutMs: 0, pollMs: 1 })
  vendor = stubVendor()
})

afterEach(() => {
  globalThis.fetch = original
  vi.unstubAllEnvs()
})

async function issue(): Promise<AgentTokenResponse> {
  const response = await agentRoute(agentTokenRequest())
  expect(response.status).toBe(200)
  return response.json()
}

function turn(sessionId: string, body: Record<string, unknown>) {
  return postTurn(
    new Request(`https://readback.example.com/api/sessions/${sessionId}/turns`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: sessionId }) },
  )
}

function callerTurn(sessionId: string, turnOrder: number, text: string) {
  return turn(sessionId, {
    turnOrder,
    transcript: text,
    isFormatted: false,
    words: text.split(" ").map((word, index) => ({
      text: word,
      start: turnOrder * 1000 + index * 300,
      end: turnOrder * 1000 + index * 300 + 250,
      confidence: 0.99,
    })),
  })
}

function tool(path: string, sessionId: string | null, body: unknown): Request {
  const url = new URL(`https://readback.example.com/api/tools/${path}`)
  if (sessionId !== null) {
    url.searchParams.set("sid", sessionId)
  }
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-readback-tool-secret": VENDOR_TOOL_SECRET,
    },
    body: JSON.stringify(body),
  })
}

function storedToolUrls(): string[] {
  const created = vendor.agentCreations().at(-1)
  const definition = JSON.parse(created?.body ?? "{}") as {
    tools?: { http: { url: string } }[]
  }
  return (definition.tools ?? []).map((entry) => entry.http.url)
}

describe("P0-1: the server issues the session id and every channel is bound to it", () => {
  it("token, turn and tool meet on one server-issued id and assemble a confirmed field", async () => {
    const issued = await issue()
    expect(issued.sessionId.length).toBeGreaterThan(8)
    expect(issued.agentId).toMatch(/^agent-\d+$/)
    expect(vendor.agentCreations()).toHaveLength(1)
    for (const url of storedToolUrls()) {
      expect(new URL(url).searchParams.get("sid"), url).toBe(issued.sessionId)
    }

    expect((await callerTurn(issued.sessionId, 1, "the drug is lisinopril")).status).toBe(200)
    const proposal = await (
      await proposeField(
        tool("propose-field", issued.sessionId, {
          field: "drug_name",
          value: "lisinopril",
          transcript_hint: "lisinopril",
        }),
      )
    ).json()
    expect(proposal.reason_code).not.toBe("E_PROVENANCE_NOT_FOUND")

    const readBackLine = "Confirming the drug name: lisinopril. Correct?"
    await turn(issued.sessionId, {
      role: "agent",
      replyId: "r1",
      text: readBackLine,
      status: "completed",
      playedMs: 2000,
      durationMs: 2000,
    })
    await callerTurn(issued.sessionId, 2, "yes")
    const confirmed = await (
      await readBack(
        tool("read-back", issued.sessionId, {
          field: "drug_name",
          candidate_id: proposal.candidate_id,
          utterance: readBackLine,
          caller_answer: "yes",
        }),
      )
    ).json()
    expect(confirmed.written_to_order).toBe(true)
  })

  it("keeps two parallel sessions apart: a turn under X proves nothing under Y", async () => {
    const x = await issue()
    const y = await issue()
    expect(x.sessionId).not.toBe(y.sessionId)
    await callerTurn(x.sessionId, 1, "the drug is lisinopril")
    const body = { field: "drug_name", value: "lisinopril", transcript_hint: "lisinopril" }
    const underY = await (await proposeField(tool("propose-field", y.sessionId, body))).json()
    expect(underY.reason_code).toBe("E_PROVENANCE_NOT_FOUND")
    const underX = await (await proposeField(tool("propose-field", x.sessionId, body))).json()
    expect(underX.reason_code).not.toBe("E_PROVENANCE_NOT_FOUND")
  })

  it("mints a fresh token for an existing session without creating a second agent", async () => {
    const issued = await issue()
    const before = vendor.agentCreations().length
    const response = await agentRoute(agentTokenRequest(issued.sessionId))
    expect(response.status).toBe(200)
    const again = (await response.json()) as AgentTokenResponse
    expect(again.sessionId).toBe(issued.sessionId)
    expect(again.agentId).toBe(issued.agentId)
    expect(vendor.agentCreations().length).toBe(before)
  })

  it(`${UNKNOWN_SESSION_CODE}: a reconnect for an id the server never issued is refused`, async () => {
    const response = await agentRoute(agentTokenRequest("never-issued"))
    expect(response.status).toBe(404)
    expect((await response.json()).code).toBe(UNKNOWN_SESSION_CODE)
    expect(vendor.tokenCalls()).toHaveLength(0)
  })

  it(`${UNKNOWN_SESSION_CODE}: turns and every session tool refuse an unregistered id and create nothing`, async () => {
    expect((await callerTurn("never-issued", 1, "lisinopril")).status).toBe(404)
    const routes = [
      [proposeField, "propose-field", { field: "drug_name", value: "x", transcript_hint: "x" }],
      [readBack, "read-back", { field: "drug_name", candidate_id: "c", utterance: "u" }],
      [commitOrder, "commit-order", { full_order_read_back: "r", caller_confirmed: true }],
    ] as const
    for (const [handler, path, body] of routes) {
      for (const sid of ["never-issued", null]) {
        const response = await handler(tool(path, sid, body))
        const payload = await response.json()
        expect(response.status, `${path} with sid ${String(sid)}`).toBe(404)
        expect(payload.code).toBe(UNKNOWN_SESSION_CODE)
        expect(payload.say_to_caller.length).toBeGreaterThan(0)
        expect(payload.written_to_order).toBe(false)
      }
    }
    expect((await callerTurn("never-issued", 2, "lisinopril")).status).toBe(404)
  })
})
