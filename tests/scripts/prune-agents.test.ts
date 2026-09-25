import { describe, expect, it } from "vitest"
import { listedAgents, orphanedSessionAgents } from "../../scripts/report/prune-agents"

const NOW = Date.parse("2026-09-25T12:00:00Z")

describe("P0-1: per-session agents left behind by an unfinalised session are found by age", () => {
  it("selects only per-session agents older than the TTL", () => {
    const agents = listedAgents({
      agents: [
        { id: "old", name: "readback-intake-abc", created_at: "2026-09-23T00:00:00Z" },
        { id: "fresh", name: "readback-intake-def", created_at: "2026-09-25T11:00:00Z" },
        { id: "shared", name: "readback-intake", created_at: "2026-09-01T00:00:00Z" },
        { id: "foreign", name: "someone-else", created_at: "2026-09-01T00:00:00Z" },
        { id: "undated", name: "readback-intake-ghi" },
      ],
    })
    expect(orphanedSessionAgents(agents, NOW)).toEqual(["old"])
  })

  it("reads a bare array as well as a wrapped list", () => {
    expect(listedAgents([{ id: "a" }])).toHaveLength(1)
    expect(listedAgents(null)).toEqual([])
  })
})
