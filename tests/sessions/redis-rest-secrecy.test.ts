import { describe, expect, it, vi } from "vitest"
import { createRedisRestClient } from "@/sessions"

const TOKEN = "planted-upstash-token-never-to-surface"
const URL_WITH_PATH = "https://planted-redis.example.com"

async function messageOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

describe("the Redis REST client never surfaces its token", () => {
  it("names neither the token nor the URL when the store answers an HTTP error", async () => {
    const client = createRedisRestClient(
      { url: URL_WITH_PATH, token: TOKEN },
      "budget store",
      vi.fn(async () => new Response("unauthorized", { status: 401 })),
    )
    const message = await messageOf(() => client.command(["GET", "k"]))
    expect(message).toContain("budget store answered 401")
    expect(message).not.toContain(TOKEN)
    expect(message).not.toContain("planted-redis")
  })

  it("names neither the token nor the URL when the store refuses a command", async () => {
    const client = createRedisRestClient(
      { url: URL_WITH_PATH, token: TOKEN },
      "intake store",
      vi.fn(async () => Response.json({ error: "WRONGPASS invalid or missing auth token" })),
    )
    const message = await messageOf(() => client.command(["GET", "k"]))
    expect(message).toContain("intake store refused a command")
    expect(message).not.toContain(TOKEN)
    expect(message).not.toContain("planted-redis")
  })

  it("sends the token only as a bearer header to the configured host", async () => {
    const doFetch = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({ result: "1" }),
    )
    const client = createRedisRestClient({ url: URL_WITH_PATH, token: TOKEN }, "store", doFetch)
    await client.command(["GET", "k"])
    const [url = "", init = {}] = doFetch.mock.calls[0] ?? []
    expect(url.startsWith(URL_WITH_PATH)).toBe(true)
    expect(url).not.toContain(TOKEN)
    expect(String(init.body)).not.toContain(TOKEN)
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`)
  })
})
