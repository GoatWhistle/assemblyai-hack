import { describe, expect, it } from "vitest"
import {
  checkAgentExists,
  checkToolReachable,
  doctorExitCode,
  type FetchLike,
  runAllChecks,
} from "../../scripts/report/doctor-checks"

function jsonFetch(status: number, body: string): FetchLike {
  return async () => new Response(body, { status })
}

function neverCalledFetch(): FetchLike {
  return async () => {
    throw new Error("this doctor check must never open a network call for this case")
  }
}

describe("checkAgentExists never opens a socket, only an ordinary GET", () => {
  it("passes when the stored agent answers 200", async () => {
    const result = await checkAgentExists("key", "agent-1", jsonFetch(200, "{}"))
    expect(result.ok).toBe(true)
  })

  it("fails loudly when the agent id is not found", async () => {
    const result = await checkAgentExists("key", "agent-1", jsonFetch(404, "not found"))
    expect(result.ok, "a 404 must read as a failed check, not a passed one").toBe(false)
    expect(result.detail).toContain("404")
  })

  it("fails loudly on a transport error instead of throwing past the caller", async () => {
    const failing: FetchLike = async () => {
      throw new Error("DNS lookup failed")
    }
    const result = await checkAgentExists("key", "agent-1", failing)
    expect(result.ok).toBe(false)
    expect(result.detail).toContain("DNS lookup failed")
  })
})

describe("checkToolReachable proves the route runs our code without ever needing a valid secret", () => {
  it("treats a 401 as reachable, because that is the running handler answering, not a dead host", async () => {
    const result = await checkToolReachable(
      "propose_field",
      "https://readback.example.com/api/tools/propose-field",
      jsonFetch(401, JSON.stringify({ error: "the shared tool secret did not match" })),
    )
    expect(result.ok, "a 401 from our own auth check is the expected reachable signal").toBe(
      true,
    )
  })

  it("fails on a 404, which means the route does not exist at that path", async () => {
    const result = await checkToolReachable(
      "propose_field",
      "https://readback.example.com/api/tools/propose-field",
      jsonFetch(404, "not found"),
    )
    expect(result.ok).toBe(false)
  })

  it("fails on a 500, which means the handler is broken rather than merely unauthenticated", async () => {
    const result = await checkToolReachable(
      "propose_field",
      "https://readback.example.com/api/tools/propose-field",
      jsonFetch(500, "internal error"),
    )
    expect(result.ok).toBe(false)
  })

  it("refuses a non-HTTPS tool URL before ever making a network call, matching what AssemblyAI itself would refuse", async () => {
    const result = await checkToolReachable(
      "propose_field",
      "http://localhost:3000/api/tools/propose-field",
      neverCalledFetch(),
    )
    expect(result.ok).toBe(false)
    expect(result.detail).toContain("HTTPS")
  })

  it("never sends a body big enough or a header set that could be mistaken for a paid streaming handshake", async () => {
    let capturedInit: RequestInit | undefined
    const capturing: FetchLike = async (_url, init) => {
      capturedInit = init
      return new Response("{}", { status: 401 })
    }
    await checkToolReachable(
      "propose_field",
      "https://readback.example.com/api/tools/x",
      capturing,
    )
    expect(capturedInit?.method).toBe("POST")
    expect(String(capturedInit?.body ?? "")).not.toContain("audio")
  })
})

describe("runAllChecks fails loudly rather than reading empty state as success", () => {
  it("produces exactly one failing check naming the missing key when ASSEMBLYAI_API_KEY is absent", async () => {
    const results = await runAllChecks({
      key: null,
      agentId: null,
      tools: [],
      doFetch: neverCalledFetch(),
    })
    expect(results).toHaveLength(1)
    expect(results[0]?.ok).toBe(false)
    expect(results[0]?.name).toBe("ASSEMBLYAI_API_KEY")
  })

  it("produces exactly one failing check naming the missing agent id when the key is present but the id is not", async () => {
    const results = await runAllChecks({
      key: "a-key",
      agentId: null,
      tools: [],
      doFetch: neverCalledFetch(),
    })
    expect(results).toHaveLength(1)
    expect(results[0]?.ok).toBe(false)
    expect(results[0]?.name).toBe("ASSEMBLYAI_AGENT_ID")
  })

  it("checks the agent and every declared tool when both credentials are present", async () => {
    const results = await runAllChecks({
      key: "a-key",
      agentId: "agent-1",
      tools: [
        {
          type: "function",
          name: "lookup_drug",
          description: "d",
          parameters: {},
          execution_mode: "interactive",
          timeout_seconds: 5,
          http: {
            url: "https://readback.example.com/api/tools/lookup-drug",
            method: "POST",
            headers: {},
          },
        },
      ],
      doFetch: jsonFetch(200, "{}"),
    })
    expect(results.map((r) => r.name)).toEqual([
      "GET https://agents.assemblyai.com/v1/agents/agent-1",
      "tool lookup_drug (https://readback.example.com/api/tools/lookup-drug)",
    ])
  })
})

describe("doctorExitCode never lets zero checks or a partial failure look like success", () => {
  it("is non-zero when no checks ran at all", () => {
    expect(doctorExitCode([])).not.toBe(0)
  })

  it("is non-zero when even one check among many failed", () => {
    expect(
      doctorExitCode([
        { name: "a", ok: true, detail: "" },
        { name: "b", ok: false, detail: "" },
        { name: "c", ok: true, detail: "" },
      ]),
    ).not.toBe(0)
  })

  it("is zero only when every check passed and at least one check ran", () => {
    expect(
      doctorExitCode([
        { name: "a", ok: true, detail: "" },
        { name: "b", ok: true, detail: "" },
      ]),
    ).toBe(0)
  })
})
