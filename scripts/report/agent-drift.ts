import { ADAPTIVE_PACING_DISABLING_FIELDS, type AgentDefinition } from "@/agent"
import { canonicalJson, sha256Hex } from "@/domain"
import type { CheckResult, FetchLike } from "./doctor-checks"

const AGENTS_URL = "https://agents.assemblyai.com/v1/agents"

type LiveTool = { readonly name?: unknown; readonly http?: { readonly url?: unknown } }

type LiveAgent = {
  readonly system_prompt?: unknown
  readonly tools?: readonly LiveTool[]
  readonly input?: { readonly turn_detection?: Readonly<Record<string, unknown>> | null }
}

export async function definitionDigest(definition: AgentDefinition): Promise<string> {
  const redacted = {
    ...definition,
    tools: definition.tools.map((tool) => ({ ...tool, http: { ...tool.http, headers: [] } })),
  }
  return sha256Hex(canonicalJson(redacted))
}

function toolPath(url: unknown): string {
  if (typeof url !== "string") {
    return "(no url)"
  }
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

export function compareAgentToDefinition(
  live: LiveAgent,
  expected: AgentDefinition,
): readonly CheckResult[] {
  const prompt = live.system_prompt === expected.system_prompt
  const liveTools = (live.tools ?? [])
    .map((tool) => `${String(tool.name)} ${toolPath(tool.http?.url)}`)
    .sort()
  const wantedTools = expected.tools
    .map((tool) => `${tool.name} ${toolPath(tool.http.url)}`)
    .sort()
  const toolsMatch = JSON.stringify(liveTools) === JSON.stringify(wantedTools)
  const detection = live.input?.turn_detection ?? {}
  const pacing = ADAPTIVE_PACING_DISABLING_FIELDS.filter((field) =>
    Object.hasOwn(detection, field),
  )
  return [
    {
      name: "stored agent system_prompt",
      ok: prompt,
      detail: prompt
        ? "identical to buildAgentDefinition"
        : "differs from buildAgentDefinition; run make agent to update it in place",
    },
    {
      name: "stored agent tools",
      ok: toolsMatch,
      detail: toolsMatch
        ? `${wantedTools.length} tools with the expected paths`
        : `live ${liveTools.join(", ")} against expected ${wantedTools.join(", ")}`,
    },
    {
      name: "stored agent adaptive pacing",
      ok: pacing.length === 0,
      detail:
        pacing.length === 0
          ? "no min_silence or max_silence, so entity-aware waiting stays on"
          : `${pacing.join(" and ")} set on the live agent, which disables entity-aware waiting for the whole session`,
    },
  ]
}

export async function checkAgentMatches(input: {
  key: string
  agentId: string
  expected: AgentDefinition
  doFetch: FetchLike
}): Promise<readonly CheckResult[]> {
  const url = `${AGENTS_URL}/${encodeURIComponent(input.agentId)}`
  try {
    const response = await input.doFetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${input.key}` },
    })
    if (response.status !== 200) {
      return [{ name: `GET ${url} (drift)`, ok: false, detail: `answered ${response.status}` }]
    }
    return compareAgentToDefinition((await response.json()) as LiveAgent, input.expected)
  } catch (error) {
    return [{ name: `GET ${url} (drift)`, ok: false, detail: String(error) }]
  }
}

export function agentWriteRequest(input: { existingId: string | null }): {
  readonly url: string
  readonly method: "POST" | "PUT"
} {
  return input.existingId === null
    ? { url: AGENTS_URL, method: "POST" }
    : { url: `${AGENTS_URL}/${encodeURIComponent(input.existingId)}`, method: "PUT" }
}
