import { NextResponse } from "next/server"

const AGENT_TOKEN_URL = "https://agents.assemblyai.com/v1/token"

export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const key = process.env.ASSEMBLYAI_API_KEY
  if (key === undefined || key.trim().length === 0) {
    return NextResponse.json(
      { error: "the server has no AssemblyAI key configured" },
      { status: 500 },
    )
  }

  const expiresIn = Number(process.env.TOKEN_EXPIRES_IN_SECONDS ?? 60)
  const maxSession = Number(process.env.MAX_SESSION_DURATION_SECONDS ?? 900)

  const url = new URL(AGENT_TOKEN_URL)
  url.searchParams.set("expires_in_seconds", String(expiresIn))
  url.searchParams.set("max_session_duration_seconds", String(maxSession))

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  })

  if (!response.ok) {
    return NextResponse.json(
      { error: "could not mint an agent token", status: response.status },
      { status: 502 },
    )
  }

  const body = (await response.json()) as { token?: string }
  if (body.token === undefined) {
    return NextResponse.json(
      { error: "the agent token response had no token" },
      { status: 502 },
    )
  }

  return NextResponse.json(
    {
      token: body.token,
      agentId: process.env.ASSEMBLYAI_AGENT_ID ?? null,
      expiresInSeconds: expiresIn,
      maxSessionDurationSeconds: maxSession,
    },
    { headers: { "cache-control": "no-store" } },
  )
}
