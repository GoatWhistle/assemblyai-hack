export const STT_TOKEN_ROUTE = "/api/tokens/stt"
export const AGENT_TOKEN_ROUTE = "/api/tokens/agent"
const STT_SOCKET_URL = "wss://streaming.assemblyai.com/v3/ws"
const AGENT_SOCKET_URL = "wss://agents.assemblyai.com/v1/ws"

export class TokenMintError extends Error {
  readonly code = "TOKEN_MINT_FAILED"
  readonly status: number

  constructor(route: string, status: number, detail: string) {
    super(`minting a token at ${route} failed with ${status}: ${detail}`)
    this.name = "TokenMintError"
    this.status = status
  }
}

type TokenResponse = { token: string }

export async function mintToken(route: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(route, {
    method: "POST",
    headers: { "content-type": "application/json" },
    ...(signal === undefined ? {} : { signal }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText)
    throw new TokenMintError(route, response.status, detail.slice(0, 200))
  }
  const payload = (await response.json()) as Partial<TokenResponse>
  if (typeof payload.token !== "string" || payload.token.length === 0) {
    throw new TokenMintError(route, response.status, "the response carried no token")
  }
  return payload.token
}

const STT_QUERY: Readonly<Record<string, string>> = Object.freeze({
  speech_model: "universal-3-5-pro",
  encoding: "pcm_s16le",
  sample_rate: "16000",
  format_turns: "true",
  domain: "medical-v1",
  voice_focus: "near-field",
  mode: "balanced",
})

export function sttSocketUrl(token: string, query: Record<string, string> = {}): string {
  const params = new URLSearchParams({ ...STT_QUERY, ...query, token })
  return `${STT_SOCKET_URL}?${params.toString()}`
}

export function agentSocketUrl(token: string): string {
  const params = new URLSearchParams({ token })
  return `${AGENT_SOCKET_URL}?${params.toString()}`
}
