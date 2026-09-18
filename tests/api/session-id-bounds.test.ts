import { beforeEach, describe, expect, it } from "vitest"
import { isUsableSessionId, MAX_SESSION_ID_CHARS, usableSessionId } from "@/domain"
import { createBlobStore } from "@/sessions"
import { POST as finalize } from "../../app/api/sessions/[id]/finalize/route"
import { GET as readSession } from "../../app/api/sessions/[id]/route"
import { POST as postTurn } from "../../app/api/sessions/[id]/turns/route"
import { POST as commitOrder } from "../../app/api/tools/commit-order/route"
import { call, refusalText, resetToolEnvironment } from "./harness"

const oneWord = [{ text: "lisinopril", start: 0, end: 200, confidence: 0.9 }]

function turnRequest(id: string): Request {
  return new Request(`https://readback.example.com/api/sessions/${id}/turns`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      turnOrder: 1,
      transcript: "lisinopril",
      isFormatted: false,
      words: oneWord,
    }),
  })
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

const HOSTILE_IDS = [
  "../../public/owned",
  "..",
  "a/../../b",
  "sessions/../../etc/passwd",
  "with space",
  "semi;colon",
  "quest?ion",
  "hash#mark",
  "%2e%2e%2fescaped",
  "a".repeat(MAX_SESSION_ID_CHARS + 1),
  "",
]

describe("a session id addresses storage, so it is validated before it is used", () => {
  beforeEach(() => {
    resetToolEnvironment()
  })

  it("accepts the shape a real session uses", () => {
    expect(usableSessionId("live-loop-session")).toBe("live-loop-session")
    expect(usableSessionId("demo-1758043212345")).toBe("demo-1758043212345")
    expect(usableSessionId("a.b_c-1")).toBe("a.b_c-1")
  })

  for (const hostile of HOSTILE_IDS) {
    it(`refuses ${JSON.stringify(hostile.slice(0, 24))} as a session id`, () => {
      expect(isUsableSessionId(hostile)).toBe(false)
      expect(usableSessionId(hostile)).toBeNull()
    })
  }

  it("refuses a traversal id on the turn route rather than creating state for it", async () => {
    const response = await postTurn(
      turnRequest("../../public/owned"),
      params("../../public/owned"),
    )
    expect(response.status).toBe(400)
  })

  it("refuses a traversal id on finalize, which would otherwise write outside the prefix", async () => {
    const response = await finalize(
      new Request("https://readback.example.com/x", { method: "POST" }),
      params("../../public/owned"),
    )
    expect(response.status).toBe(400)
    expect(refusalText(await response.json())).toContain("not usable")
  })

  it("refuses a 100k character id on finalize", async () => {
    const response = await finalize(
      new Request("https://readback.example.com/x", { method: "POST" }),
      params("a".repeat(100_000)),
    )
    expect(response.status).toBe(400)
  })

  it("refuses an empty prefix on the session read route, which would return a stranger's session", async () => {
    const response = await readSession(
      new Request("https://readback.example.com/x"),
      params(""),
    )
    expect(response.status).toBe(400)
  })

  it("refuses a hostile session_id inside a tool call", async () => {
    const response = await commitOrder(
      call("commit-order", {
        session_id: "../../public/owned",
        full_order_read_back: "the whole order",
        caller_confirmed: true,
      }),
    )
    expect(response.status).toBe(400)
    expect(refusalText(await response.json())).toContain("session_id")
  })

  it("the blob store itself refuses an unsafe key, whoever the caller is", async () => {
    const store = createBlobStore("token", {
      put: async () => ({ url: "https://blob.example.com/x" }),
      list: async () => ({ blobs: [] }),
    })
    await expect(
      store.put({
        sessionId: "../../public/owned",
        startedAt: "2026-09-16T00:00:00.000Z",
        endedAt: null,
        decisions: [],
        events: [],
        closes: [],
        origin: "live",
        gateEnabled: true,
        orderId: null,
        committed: false,
      }),
    ).rejects.toThrow("safe blob key")
  })

  it("the blob store refuses an unsafe key on read too", async () => {
    const store = createBlobStore("token", {
      put: async () => ({ url: "https://blob.example.com/x" }),
      list: async () => ({ blobs: [] }),
    })
    await expect(store.get("..")).rejects.toThrow("safe blob key")
  })
})
