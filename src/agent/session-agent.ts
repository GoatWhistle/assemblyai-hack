import { UpstreamError } from "@/domain"
import { buildAgentDefinition } from "./session-config"

export const AGENTS_URL = "https://agents.assemblyai.com/v1/agents"

export type AgentFetch = (url: string, init: RequestInit) => Promise<Response>

function agentIdOf(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null
  }
  const record = body as { agent_id?: unknown; id?: unknown }
  if (typeof record.agent_id === "string" && record.agent_id.length > 0) {
    return record.agent_id
  }
  return typeof record.id === "string" && record.id.length > 0 ? record.id : null
}

export async function createSessionAgent(input: {
  apiKey: string
  baseUrl: string
  toolSecret: string
  sessionId: string
  model?: string
  doFetch?: AgentFetch
}): Promise<string> {
  const definition = buildAgentDefinition({
    baseUrl: input.baseUrl,
    toolSecret: input.toolSecret,
    sessionId: input.sessionId,
    model: input.model,
  })
  const doFetch = input.doFetch ?? fetch
  const response = await doFetch(AGENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(definition),
    cache: "no-store",
  })
  if (!response.ok) {
    throw new UpstreamError(response.status, `POST ${AGENTS_URL} answered ${response.status}`)
  }
  const id = agentIdOf(await response.json())
  if (id === null) {
    throw new UpstreamError(502, "the agent creation response carried no agent id")
  }
  return id
}

export type AgentDeletion = "deleted" | "already_gone" | "failed"

export async function deleteSessionAgent(input: {
  apiKey: string
  agentId: string
  doFetch?: AgentFetch
}): Promise<AgentDeletion> {
  const doFetch = input.doFetch ?? fetch
  try {
    const response = await doFetch(`${AGENTS_URL}/${encodeURIComponent(input.agentId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${input.apiKey}` },
      cache: "no-store",
    })
    if (response.status === 204 || response.ok) {
      return "deleted"
    }
    return response.status === 404 ? "already_gone" : "failed"
  } catch {
    return "failed"
  }
}
