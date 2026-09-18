import { NextResponse } from "next/server"
import {
  admitAgainstRateBrake,
  allowlistedTokenFields,
  freshRateBrakeState,
  RATE_BRAKE_HONESTY_NOTE,
  tokenLifetime,
  vendorTokenOf,
} from "@/domain"

const STT_TOKEN_URL = "https://streaming.assemblyai.com/v3/token"

export const dynamic = "force-dynamic"

const rateBrakeState = freshRateBrakeState()

export async function GET(): Promise<NextResponse> {
  const brake = admitAgainstRateBrake({ state: rateBrakeState, nowMs: Date.now() })
  if (!brake.allowed) {
    return NextResponse.json(
      {
        error: `this instance has minted too many streaming tokens in the last window; ${RATE_BRAKE_HONESTY_NOTE}`,
      },
      { status: 429, headers: { "retry-after": String(Math.ceil(brake.retryAfterMs / 1000)) } },
    )
  }

  const key = process.env.ASSEMBLYAI_API_KEY
  if (key === undefined || key.trim().length === 0) {
    return NextResponse.json(
      { error: "the server has no AssemblyAI key configured" },
      { status: 500 },
    )
  }

  const { expiresInSeconds: expiresIn, maxSessionDurationSeconds: maxSession } = tokenLifetime(
    process.env,
  )

  const url = new URL(STT_TOKEN_URL)
  url.searchParams.set("expires_in_seconds", String(expiresIn))
  url.searchParams.set("max_session_duration_seconds", String(maxSession))

  const response = await fetch(url, {
    headers: { Authorization: key },
    cache: "no-store",
  })

  if (!response.ok) {
    return NextResponse.json({ error: "could not mint a streaming token" }, { status: 502 })
  }

  const token = vendorTokenOf(await response.json())
  if (token === undefined) {
    return NextResponse.json(
      { error: "the streaming token response had no token" },
      { status: 502 },
    )
  }

  return NextResponse.json(
    allowlistedTokenFields({
      token,
      expiresInSeconds: expiresIn,
      maxSessionDurationSeconds: maxSession,
    }),
    { headers: { "cache-control": "no-store" } },
  )
}
