import type { SessionBinding } from "@/domain"
import { EXPECTED_STT_MODEL } from "./stt-model"

export const STT_TOKEN_ROUTE = "/api/tokens/stt"
export const AGENT_TOKEN_ROUTE = "/api/tokens/agent"
const STT_SOCKET_URL = "wss://streaming.assemblyai.com/v3/ws"
const AGENT_SOCKET_URL = "wss://agents.assemblyai.com/v1/ws"

export class TokenMintError extends Error {
  readonly code = "TOKEN_MINT_FAILED"
  readonly status: number
  readonly refusalCode: string | null
  readonly explanation: string | null

  constructor(
    route: string,
    status: number,
    detail: string,
    refusalCode: string | null = null,
    explanation: string | null = null,
  ) {
    super(`minting a token at ${route} failed with ${status}: ${detail}`)
    this.name = "TokenMintError"
    this.status = status
    this.refusalCode = refusalCode
    this.explanation = explanation
  }
}

function bodyField(detail: string, field: string): string | null {
  try {
    const parsed = JSON.parse(detail) as unknown
    if (typeof parsed === "object" && parsed !== null) {
      const value = (parsed as Record<string, unknown>)[field]
      return typeof value === "string" && value.length > 0 ? value : null
    }
  } catch {
    return null
  }
  return null
}

async function fetchTokenPayload(
  route: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const response = await fetch(route, {
    method: "GET",
    cache: "no-store",
    ...(signal === undefined ? {} : { signal }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText)
    throw new TokenMintError(
      route,
      response.status,
      detail.slice(0, 200),
      bodyField(detail, "code"),
      bodyField(detail, "explanation") ?? bodyField(detail, "error"),
    )
  }
  const payload = (await response.json()) as unknown
  if (typeof payload !== "object" || payload === null) {
    throw new TokenMintError(route, response.status, "the response was not an object")
  }
  const record = payload as Record<string, unknown>
  if (typeof record.token !== "string" || record.token.length === 0) {
    throw new TokenMintError(route, response.status, "the response carried no token")
  }
  return record
}

export async function mintToken(route: string, signal?: AbortSignal): Promise<string> {
  const payload = await fetchTokenPayload(route, signal)
  return payload.token as string
}

export type AgentTokenGrant = {
  readonly token: string
  readonly binding: SessionBinding
}

export function agentTokenRoute(route: string, sessionId: string | null): string {
  if (sessionId === null) {
    return route
  }
  const separator = route.includes("?") ? "&" : "?"
  return `${route}${separator}${new URLSearchParams({ sessionId }).toString()}`
}

export async function mintAgentToken(
  route: string,
  sessionId: string | null,
  signal?: AbortSignal,
): Promise<AgentTokenGrant> {
  const url = agentTokenRoute(route, sessionId)
  const payload = await fetchTokenPayload(url, signal)
  const issued = payload.sessionId
  if (typeof issued !== "string" || issued.length === 0) {
    throw new TokenMintError(url, 200, "the response carried no server-issued session id")
  }
  if (sessionId !== null && issued !== sessionId) {
    throw new TokenMintError(url, 200, "the reconnect token was issued for a different session")
  }
  const agentId = typeof payload.agentId === "string" ? payload.agentId : ""
  return { token: payload.token as string, binding: { sessionId: issued, agentId } }
}

const STT_QUERY: Readonly<Record<string, string>> = Object.freeze({
  speech_model: EXPECTED_STT_MODEL,
  encoding: "pcm_s16le",
  sample_rate: "16000",
  format_turns: "true",
  domain: "medical-v1",
  voice_focus: "near-field",
  mode: "balanced",
})

export function sttQueryParams(
  token: string,
  query: Record<string, string> = {},
): Record<string, string> {
  return { ...STT_QUERY, ...query, token }
}

export function sttSocketUrl(token: string, query: Record<string, string> = {}): string {
  const params = new URLSearchParams(sttQueryParams(token, query))
  return `${STT_SOCKET_URL}?${params.toString()}`
}

export function agentSocketUrl(token: string): string {
  const params = new URLSearchParams({ token })
  return `${AGENT_SOCKET_URL}?${params.toString()}`
}
