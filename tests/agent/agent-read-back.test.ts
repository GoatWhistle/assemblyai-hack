import { describe, expect, it } from "vitest"
import { AGENT_READ_BACK_ATTEMPTS, AGENTS_URL, createSessionAgent } from "@/agent"
import { UpstreamError } from "@/domain"

type Seen = { readonly url: string; readonly method: string }

function vendor(readBack: (attempt: number) => number) {
  const seen: Seen[] = []
  let reads = 0
  const doFetch = async (url: string, init: RequestInit): Promise<Response> => {
    const method = init.method ?? "GET"
    seen.push({ url, method })
    if (method === "POST") {
      return Response.json({ id: "agent_fresh" }, { status: 201 })
    }
    if (method === "DELETE") {
      return new Response(null, { status: 204 })
    }
    reads += 1
    return new Response(null, { status: readBack(reads) })
  }
  return { seen, doFetch }
}

const INPUT = {
  apiKey: "key",
  baseUrl: "https://readback.example.com",
  toolSecret: "secret",
  sessionId: "s-1",
  readBackPauseMs: 0,
}

describe("a created agent is read back before any browser is told to load it", () => {
  it("returns the id once the vendor serves the agent it just created", async () => {
    const { seen, doFetch } = vendor(() => 200)
    await expect(createSessionAgent({ ...INPUT, doFetch })).resolves.toBe("agent_fresh")
    expect(seen.map((call) => call.method)).toEqual(["POST", "GET"])
    expect(seen[1]?.url).toBe(`${AGENTS_URL}/agent_fresh`)
  })

  it("tolerates a short delay before the agent becomes readable", async () => {
    const { doFetch } = vendor((attempt) => (attempt < AGENT_READ_BACK_ATTEMPTS ? 404 : 200))
    await expect(createSessionAgent({ ...INPUT, doFetch })).resolves.toBe("agent_fresh")
  })

  it("refuses, names the status and removes the agent when the vendor never serves it", async () => {
    const { seen, doFetch } = vendor(() => 404)
    const failure = createSessionAgent({ ...INPUT, doFetch })
    await expect(failure).rejects.toBeInstanceOf(UpstreamError)
    await expect(failure).rejects.toThrow(/agent_fresh.*answered 404/)
    expect(seen.filter((call) => call.method === "GET")).toHaveLength(AGENT_READ_BACK_ATTEMPTS)
    expect(seen.at(-1)).toEqual({ url: `${AGENTS_URL}/agent_fresh`, method: "DELETE" })
  })
})
