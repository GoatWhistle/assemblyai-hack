import { NextResponse } from "next/server"
import {
  admitAgainstRateBrake,
  allowlistedTokenFields,
  freshRateBrakeState,
  RATE_BRAKE_HONESTY_NOTE,
  ReadbackError,
  tokenLifetime,
  vendorTokenOf,
} from "@/domain"
import { type BudgetedMint, budgetForClient, mintWithinBudget } from "@/sessions"

const STT_TOKEN_URL = "https://streaming.assemblyai.com/v3/token"

export const dynamic = "force-dynamic"

const rateBrakeState = freshRateBrakeState()

async function mint(
  key: string,
  expiresIn: number,
  maxSession: number,
): Promise<string | null> {
  const url = new URL(STT_TOKEN_URL)
  url.searchParams.set("expires_in_seconds", String(expiresIn))
  url.searchParams.set("max_session_duration_seconds", String(maxSession))
  const response = await fetch(url, {
    headers: { Authorization: key },
    cache: "no-store",
  })
  if (!response.ok) {
    return null
  }
  return vendorTokenOf(await response.json()) ?? null
}

export async function GET(request?: Request): Promise<NextResponse> {
  const nowMs = Date.now()
  const brake = admitAgainstRateBrake({ state: rateBrakeState, nowMs })
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

  let outcome: BudgetedMint<string>
  try {
    outcome = await mintWithinBudget({
      budget: budgetForClient(request?.headers),
      seconds: maxSession,
      nowMs,
      mint: () => mint(key, expiresIn, maxSession),
    })
  } catch (error) {
    if (error instanceof ReadbackError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 })
    }
    throw error
  }
  if (outcome.kind === "refused") {
    return NextResponse.json(outcome.refusal, { status: 429 })
  }
  if (outcome.kind === "failed") {
    return NextResponse.json({ error: "could not mint a streaming token" }, { status: 502 })
  }
  const token = outcome.value

  return NextResponse.json(
    allowlistedTokenFields({
      token,
      expiresInSeconds: expiresIn,
      maxSessionDurationSeconds: maxSession,
    }),
    { headers: { "cache-control": "no-store" } },
  )
}
