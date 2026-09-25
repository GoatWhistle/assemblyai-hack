import { describe, expect, it } from "vitest"
import { buildAgentDefinition } from "@/agent"
import {
  agentWriteRequest,
  checkAgentMatches,
  compareAgentToDefinition,
  definitionDigest,
} from "../../scripts/report/agent-drift"

const expected = buildAgentDefinition({
  baseUrl: "https://readback.example.com",
  toolSecret: "a-secret-that-is-long-enough",
})

describe("H4: make agent updates in place and make doctor detects drift", () => {
  it("creates when no id is recorded and updates with PUT when one is", () => {
    expect(agentWriteRequest({ existingId: null }).method).toBe("POST")
    const update = agentWriteRequest({ existingId: "agent-1" })
    expect(update.method).toBe("PUT")
    expect(update.url.endsWith("/v1/agents/agent-1")).toBe(true)
  })

  it("hashes the definition without the write-only secret", async () => {
    const other = buildAgentDefinition({
      baseUrl: "https://readback.example.com",
      toolSecret: "a-different-secret-entirely",
    })
    expect(await definitionDigest(expected)).toBe(await definitionDigest(other))
    expect(await definitionDigest(expected)).toMatch(/^[0-9a-f]{64}$/)
  })

  it("passes a live agent identical to the definition", () => {
    const results = compareAgentToDefinition(JSON.parse(JSON.stringify(expected)), expected)
    expect(results.every((result) => result.ok)).toBe(true)
  })

  it("fails a live agent that carries min_silence", () => {
    const live = JSON.parse(JSON.stringify(expected))
    live.input.turn_detection.min_silence = 400
    const pacing = compareAgentToDefinition(live, expected).find((r) =>
      r.name.includes("adaptive pacing"),
    )
    expect(pacing?.ok).toBe(false)
  })

  it("fails a live agent whose prompt or tools drifted", () => {
    const live = JSON.parse(JSON.stringify(expected))
    live.system_prompt = "old prompt"
    live.tools = live.tools.slice(1)
    const failed = compareAgentToDefinition(live, expected).filter((r) => !r.ok)
    expect(failed.map((r) => r.name)).toEqual([
      "stored agent system_prompt",
      "stored agent tools",
    ])
  })

  it("reports a non-200 from the vendor as a failed check, not a pass", async () => {
    const results = await checkAgentMatches({
      key: "k",
      agentId: "a",
      expected,
      doFetch: async () => new Response("", { status: 404 }),
    })
    expect(results).toHaveLength(1)
    expect(results[0]?.ok).toBe(false)
  })
})
