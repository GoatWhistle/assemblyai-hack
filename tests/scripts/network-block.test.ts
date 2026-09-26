import { describe, expect, it } from "vitest"
import { NETWORK_BLOCK_MESSAGE, PAID_CREDENTIAL_VARS } from "../setup"

describe("H6: tests cannot reach the network, by mechanism rather than by review", () => {
  it("refuses an outgoing fetch before any byte leaves", async () => {
    await expect(fetch("https://streaming.assemblyai.com/v3/token")).rejects.toThrow(
      NETWORK_BLOCK_MESSAGE,
    )
  })

  it("refuses to open a WebSocket", () => {
    expect(() => new WebSocket("wss://agents.us.assemblyai.com/v1/ws")).toThrow(
      NETWORK_BLOCK_MESSAGE,
    )
  })

  it("blanks the shared-store credentials alongside the paid ones", () => {
    for (const name of [
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "KV_REST_API_TOKEN",
    ]) {
      expect(PAID_CREDENTIAL_VARS as readonly string[]).toContain(name)
      expect(process.env[name]).toBeUndefined()
    }
  })
})
