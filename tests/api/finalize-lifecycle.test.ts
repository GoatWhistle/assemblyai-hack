import { POST as finalizeRoute } from "@app/api/sessions/[id]/finalize/route"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { UNKNOWN_SESSION_CODE } from "@/domain"
import {
  createMemoryBudget,
  createMemoryStore,
  dailyBudget,
  installDailyBudget,
  installSessionStore,
  type SessionStore,
} from "@/sessions"
import { isRegisteredSession } from "@/tools"
import { AGENT, registerSession, resetToolEnvironment, SESSION } from "./harness"

const KEY = "a-real-looking-key"
const AGENTS = "https://agents.assemblyai.com/v1/agents"
const original = globalThis.fetch

type Deletion = { readonly url: string; readonly authorization: string }

let store: SessionStore
let deletions: Deletion[]

function vendorAnswering(status: number): void {
  globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>
    if (init?.method === "DELETE") {
      deletions.push({ url: String(url), authorization: headers.Authorization ?? "" })
    }
    return new Response(null, { status })
  }) as typeof fetch
}

function finalize(sessionId: string) {
  return finalizeRoute(
    new Request(`https://readback.example.com/api/sessions/${sessionId}/finalize`, {
      method: "POST",
    }),
    { params: Promise.resolve({ id: sessionId }) },
  )
}

beforeEach(async () => {
  await resetToolEnvironment()
  store = createMemoryStore()
  installSessionStore(store)
  installDailyBudget(createMemoryBudget(10_000))
  deletions = []
  vi.stubEnv("ASSEMBLYAI_API_KEY", KEY)
  vendorAnswering(204)
})

afterEach(() => {
  globalThis.fetch = original
  vi.unstubAllEnvs()
  installSessionStore(null)
  installDailyBudget(null)
})

describe("AU7: finalize ends the billed lifecycle exactly once", () => {
  it("stores the session, drops the live intake and deletes this session's own agent", async () => {
    const response = await finalize(SESSION)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      alreadyFinalized: false,
      agentId: AGENT,
      agentDeletion: "deleted",
    })
    expect(deletions).toEqual([
      { url: `${AGENTS}/${encodeURIComponent(AGENT)}`, authorization: `Bearer ${KEY}` },
    ])
    expect(await store.get(SESSION)).not.toBeNull()
    expect(await isRegisteredSession(SESSION)).toBe(false)
  })

  it("is idempotent: a second finalize answers alreadyFinalized and deletes nothing again", async () => {
    expect((await finalize(SESSION)).status).toBe(200)
    const second = await finalize(SESSION)
    expect(second.status).toBe(200)
    expect(await second.json()).toMatchObject({ sessionId: SESSION, alreadyFinalized: true })
    expect(deletions).toHaveLength(1)
  })

  it(`${UNKNOWN_SESSION_CODE}: an id never registered stores nothing and deletes no agent`, async () => {
    const response = await finalize("never-issued")
    expect(response.status).toBe(404)
    expect((await response.json()).code).toBe(UNKNOWN_SESSION_CODE)
    expect(deletions).toHaveLength(0)
    expect(await store.get("never-issued")).toBeNull()
  })

  it("finalizing one session deletes only its own agent and leaves the other session live", async () => {
    await registerSession("other-session", "agent-other")
    await finalize(SESSION)
    expect(deletions.map((deletion) => deletion.url)).toEqual([
      `${AGENTS}/${encodeURIComponent(AGENT)}`,
    ])
    expect(await isRegisteredSession("other-session")).toBe(true)
  })

  it("reports an agent the vendor no longer has as already gone, and still finalizes", async () => {
    vendorAnswering(404)
    const body = await (await finalize(SESSION)).json()
    expect(body.agentDeletion).toBe("already_gone")
    expect(await store.get(SESSION)).not.toBeNull()
  })

  it("reports a failed deletion rather than hiding it, and still finalizes", async () => {
    vendorAnswering(500)
    const body = await (await finalize(SESSION)).json()
    expect(body.agentDeletion).toBe("failed")
    expect(await isRegisteredSession(SESSION)).toBe(false)
  })

  it("without a key it says so and makes no vendor call", async () => {
    vi.stubEnv("ASSEMBLYAI_API_KEY", "")
    const body = await (await finalize(SESSION)).json()
    expect(body.agentDeletion).toBe("no_key")
    expect(deletions).toHaveLength(0)
  })

  it("refunds no budget: the server cannot prove the sockets closed, so the reservation stands", async () => {
    await dailyBudget().debit(900, Date.now())
    const before = await dailyBudget().status(Date.now())
    await finalize(SESSION)
    expect(await dailyBudget().status(Date.now())).toEqual(before)
  })
})
