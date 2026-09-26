import { AGENT_API_BASE, UpstreamError } from "@/domain"
import { buildAgentDefinition } from "./session-config"

export const AGENTS_URL = `${AGENT_API_BASE}/agents`

export type AgentFetch = (url: string, init: RequestInit) => Promise<Response>

export const AGENT_READ_BACK_ATTEMPTS = 3

const READ_BACK_PAUSE_MS = 400

async function readBackStatus(input: {
  apiKey: string
  agentId: string
  doFetch: AgentFetch
  pauseMs: number
}): Promise<number> {
  let status = 0
  for (let attempt = 0; attempt < AGENT_READ_BACK_ATTEMPTS; attempt += 1) {
    const response = await input.doFetch(`${AGENTS_URL}/${encodeURIComponent(input.agentId)}`, {
      headers: { Authorization: `Bearer ${input.apiKey}` },
      cache: "no-store",
    })
    status = response.status
    if (response.ok) {
      return status
    }
    await new Promise((resolve) => setTimeout(resolve, input.pauseMs))
  }
  return status
}

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
  doFetch?: AgentFetch
  readBackPauseMs?: number
}): Promise<string> {
  const definition = buildAgentDefinition({
    baseUrl: input.baseUrl,
    toolSecret: input.toolSecret,
    sessionId: input.sessionId,
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
  const status = await readBackStatus({
    apiKey: input.apiKey,
    agentId: id,
    doFetch,
    pauseMs: input.readBackPauseMs ?? READ_BACK_PAUSE_MS,
  })
  if (status < 200 || status >= 300) {
    await deleteSessionAgent({ apiKey: input.apiKey, agentId: id, doFetch })
    throw new UpstreamError(
      502,
      `the vendor created ${id} but GET ${AGENTS_URL}/${id} answered ${status} ${AGENT_READ_BACK_ATTEMPTS} times, so a socket could not load it either`,
    )
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
