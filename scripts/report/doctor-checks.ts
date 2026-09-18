import type { AgentTool } from "@/agent"

const AGENTS_URL = "https://agents.assemblyai.com/v1/agents"

export type CheckResult = {
  readonly name: string
  readonly ok: boolean
  readonly detail: string
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export async function checkAgentExists(
  key: string,
  agentId: string,
  doFetch: FetchLike,
): Promise<CheckResult> {
  const url = `${AGENTS_URL}/${agentId}`
  try {
    const response = await doFetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    })
    if (response.status === 200) {
      return { name: `GET ${url}`, ok: true, detail: "the stored agent exists (200)" }
    }
    const text = await response.text()
    return {
      name: `GET ${url}`,
      ok: false,
      detail: `expected 200, got ${response.status}: ${text.slice(0, 200)}`,
    }
  } catch (error) {
    return {
      name: `GET ${url}`,
      ok: false,
      detail: `network failure before a status code arrived: ${String(error)}`,
    }
  }
}

export async function checkToolReachable(
  toolName: string,
  url: string,
  doFetch: FetchLike,
): Promise<CheckResult> {
  if (!url.startsWith("https://")) {
    return {
      name: `tool ${toolName} (${url})`,
      ok: false,
      detail: "the URL is not HTTPS, so AssemblyAI would refuse to call it either",
    }
  }
  try {
    const response = await doFetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    if (response.status === 401) {
      return {
        name: `tool ${toolName} (${url})`,
        ok: true,
        detail:
          "reachable: the route answered 401 for a missing tool secret, which is the running handler, not a dead host",
      }
    }
    const text = await response.text()
    return {
      name: `tool ${toolName} (${url})`,
      ok: false,
      detail: `expected 401 (unauthenticated but reachable), got ${response.status}: ${text.slice(0, 200)}`,
    }
  } catch (error) {
    return {
      name: `tool ${toolName} (${url})`,
      ok: false,
      detail: `unreachable before a status code arrived: ${String(error)}`,
    }
  }
}

export async function runAllChecks(input: {
  key: string | null
  agentId: string | null
  tools: readonly AgentTool[]
  doFetch: FetchLike
}): Promise<readonly CheckResult[]> {
  const results: CheckResult[] = []

  if (input.key === null) {
    results.push({
      name: "ASSEMBLYAI_API_KEY",
      ok: false,
      detail: "not set; the agent existence check cannot run without it",
    })
  } else if (input.agentId === null) {
    results.push({
      name: "ASSEMBLYAI_AGENT_ID",
      ok: false,
      detail: "not set; run `make agent` once and record the id before this check can run",
    })
  } else {
    results.push(await checkAgentExists(input.key, input.agentId, input.doFetch))
  }

  for (const tool of input.tools) {
    results.push(await checkToolReachable(tool.name, tool.http.url, input.doFetch))
  }

  return results
}

export function doctorExitCode(results: readonly CheckResult[]): number {
  if (results.length === 0) {
    return 1
  }
  return results.some((result) => !result.ok) ? 1 : 0
}
