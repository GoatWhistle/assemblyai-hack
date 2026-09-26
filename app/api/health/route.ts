import { lookup } from "node:dns/promises"
import { NextResponse } from "next/server"
import { vendorView } from "@/agent"
import {
  type DeployHealth,
  RATE_BRAKE_HONESTY_NOTE,
  ReadbackError,
  STT_MODEL,
  tokenLifetime,
} from "@/domain"
import { dailyBudget } from "@/sessions"

export const dynamic = "force-dynamic"

const BUILD_SHA_PATTERN = /^[0-9a-f]{7,40}$/

function buildSha(raw: string | undefined): string | null {
  const value = raw?.trim().toLowerCase() ?? ""
  return BUILD_SHA_PATTERN.test(value) ? value : null
}

export async function GET(): Promise<NextResponse> {
  const lifetime = tokenLifetime(process.env)
  try {
    const budget = await dailyBudget().status(Date.now())
    const health: DeployHealth = {
      model: STT_MODEL,
      tokenExpiresInSeconds: lifetime.expiresInSeconds,
      maxSessionDurationSeconds: lifetime.maxSessionDurationSeconds,
      budget,
      rateBrakeNote: RATE_BRAKE_HONESTY_NOTE,
      buildSha: buildSha(process.env.VERCEL_GIT_COMMIT_SHA),
      vendor: await vendorView(
        { apiKey: process.env.ASSEMBLYAI_API_KEY, region: process.env.VERCEL_REGION },
        async (host) => (await lookup(host, { all: true })).map((entry) => entry.address),
      ),
    }
    return NextResponse.json(health, { headers: { "cache-control": "no-store" } })
  } catch (error) {
    if (error instanceof ReadbackError) {
      return NextResponse.json(
        { error: "the deployment cannot read its shared store", code: error.code },
        { status: 503, headers: { "cache-control": "no-store" } },
      )
    }
    throw error
  }
}
