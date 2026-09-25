import { afterEach, describe, expect, it, vi } from "vitest"
import { createBlobStore, SessionOrigin, type StoredSession } from "@/sessions"

const original = globalThis.fetch

afterEach(() => {
  globalThis.fetch = original
})

function stored(sessionId: string): StoredSession {
  return {
    sessionId,
    startedAt: "2026-09-25T00:00:00.000Z",
    endedAt: "2026-09-25T00:01:00.000Z",
    decisions: [],
    events: [],
    closes: [],
    gateEnabled: true,
    origin: SessionOrigin.Live,
    orderId: null,
    committed: false,
  }
}

describe("reading every stored session costs one list, not one list per session", () => {
  it("remembers each blob URL a listing returned, so the metrics pass does not list again per session", async () => {
    const sessions = ["s-one", "s-two", "s-three"]
    const prefixes: string[] = []
    const store = createBlobStore("token", {
      put: async (path) => ({ url: `https://blob.example.com/${path}` }),
      list: async ({ prefix }) => {
        prefixes.push(prefix)
        return {
          blobs: sessions.map((id) => ({
            url: `https://blob.example.com/sessions/live/${id}.json`,
            pathname: `sessions/live/${id}.json`,
          })),
        }
      },
    })
    globalThis.fetch = vi.fn(async (url: unknown) => {
      const id = /\/([^/]+)\.json$/.exec(String(url))?.[1] ?? ""
      return Response.json(stored(id))
    }) as typeof fetch

    const summaries = await store.list()
    expect(summaries).toHaveLength(sessions.length)
    for (const id of sessions) {
      expect((await store.get(id))?.sessionId).toBe(id)
    }
    expect(
      prefixes,
      "a get after a listing must reuse the URL the listing returned",
    ).toHaveLength(1)
  })
})
