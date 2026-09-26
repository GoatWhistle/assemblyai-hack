import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { createSessionAgent, toolBaseUrl } from "@/agent"
import {
  type AgentTokenResponse,
  admitAgainstRateBrake,
  allowlistedTokenFields,
  freshRateBrakeState,
  RATE_BRAKE_HONESTY_NOTE,
  ReadbackError,
  type SessionBinding,
  tokenLifetime,
  UNKNOWN_SESSION_CODE,
  UpstreamError,
  usableSessionId,
  vendorTokenOf,
} from "@/domain"
import { budgetForClient, mintWithinBudget } from "@/sessions"
import { loadIntake, registerIntake } from "@/tools"

const AGENT_TOKEN_URL = "https://agents.assemblyai.com/v1/token"

export const dynamic = "force-dynamic"

export const maxDuration = 20

const rateBrakeState = freshRateBrakeState()

class RouteRefusal extends Error {
  readonly response: NextResponse

  constructor(response: NextResponse) {
    super("refused")
    this.response = response
  }
}

function failure(error: string, status: number, code?: string): NextResponse {
  return NextResponse.json(code === undefined ? { error } : { error, code }, { status })
}

function configured(value: string | undefined): string | null {
  return value === undefined || value.trim().length === 0 ? null : value.trim()
}

async function mint(key: string, expiresIn: number, maxSession: number): Promise<string> {
  const url = new URL(AGENT_TOKEN_URL)
  url.searchParams.set("expires_in_seconds", String(expiresIn))
  url.searchParams.set("max_session_duration_seconds", String(maxSession))
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  })
  const token = response.ok ? vendorTokenOf(await response.json()) : undefined
  if (token === undefined) {
    throw new RouteRefusal(failure("could not mint an agent token", 502))
  }
  return token
}

async function existingBinding(sessionId: string): Promise<SessionBinding> {
  const state = await loadIntake(sessionId)
  if (state === null) {
    throw new RouteRefusal(
      failure(`no registered session ${sessionId}`, 404, UNKNOWN_SESSION_CODE),
    )
  }
  return { sessionId, agentId: state.agentId }
}

async function newBinding(input: {
  key: string
  toolSecret: string
  baseUrl: string
}): Promise<SessionBinding> {
  const sessionId = randomUUID()
  try {
    const agentId = await createSessionAgent({
      apiKey: input.key,
      baseUrl: input.baseUrl,
      toolSecret: input.toolSecret,
      sessionId,
      model: configured(process.env.AGENT_LLM_MODEL) ?? undefined,
    })
    await registerIntake({ sessionId, agentId })
    return { sessionId, agentId }
  } catch (error) {
    if (error instanceof UpstreamError) {
      throw new RouteRefusal(failure("could not create the agent for this session", 502))
    }
    throw error
  }
}

function refusalOf(error: unknown): NextResponse {
  if (error instanceof RouteRefusal) {
    return error.response
  }
  if (error instanceof ReadbackError) {
    return failure(error.message, 503, error.code)
  }
  throw error
}

export async function GET(request: Request): Promise<NextResponse> {
  const nowMs = Date.now()
  const brake = admitAgainstRateBrake({ state: rateBrakeState, nowMs })
  if (!brake.allowed) {
    return NextResponse.json(
      {
        error: `this instance has minted too many agent tokens in the last window; ${RATE_BRAKE_HONESTY_NOTE}`,
      },
      { status: 429, headers: { "retry-after": String(Math.ceil(brake.retryAfterMs / 1000)) } },
    )
  }

  const key = configured(process.env.ASSEMBLYAI_API_KEY)
  if (key === null) {
    return failure("the server has no AssemblyAI key configured", 500)
  }
  const toolSecret = configured(process.env.AGENT_TOOL_SECRET)
  if (toolSecret === null) {
    return failure("the server has no AGENT_TOOL_SECRET configured for the agent's tools", 500)
  }

  const { expiresInSeconds, maxSessionDurationSeconds } = tokenLifetime(process.env)
  const requestUrl = new URL(request.url)
  const requested = requestUrl.searchParams.get("sessionId")
  const reconnectId = requested === null ? null : usableSessionId(requested)
  if (requested !== null && reconnectId === null) {
    return failure("the session id is not usable", 404, UNKNOWN_SESSION_CODE)
  }

  const base = toolBaseUrl(process.env, requestUrl.origin)
  if (!base.ok) {
    return failure(base.reason, 500)
  }
  const baseUrl = base.url

  try {
    const binding = reconnectId === null ? null : await existingBinding(reconnectId)
    const outcome = await mintWithinBudget({
      budget: budgetForClient(request.headers),
      seconds: maxSessionDurationSeconds,
      nowMs,
      mint: async () => {
        const bound = binding ?? (await newBinding({ key, toolSecret, baseUrl }))
        const token = await mint(key, expiresInSeconds, maxSessionDurationSeconds)
        return { bound, token }
      },
    })
    if (outcome.kind === "refused") {
      return NextResponse.json(outcome.refusal, { status: 429 })
    }
    if (outcome.kind === "failed") {
      return refusalOf(outcome.error)
    }
    const body: AgentTokenResponse = {
      ...allowlistedTokenFields({
        token: outcome.value.token,
        expiresInSeconds,
        maxSessionDurationSeconds,
      }),
      sessionId: outcome.value.bound.sessionId,
      agentId: outcome.value.bound.agentId,
    }
    return NextResponse.json(body, { headers: { "cache-control": "no-store" } })
  } catch (error) {
    return refusalOf(error)
  }
}
