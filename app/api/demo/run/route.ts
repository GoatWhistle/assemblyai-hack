import { NextResponse } from "next/server"
import { z } from "zod"
import { DEMO_SCENARIOS, PAIR_RULE_FLAG } from "@/domain"
import { runDemo, runScenario } from "@/sessions"
import { toolCatalog } from "@/tools"

export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const sessionId = `demo-${Date.now()}`
  const outcomes = runDemo(sessionId)

  return NextResponse.json({
    sessionId,
    description:
      "the human said hydromorphone, the recognizer returned Morphine at confidence 1.0, and the validator passed it; HYDROmorphone - morphine is a row of the 2023 ISMP List of Confused Drug Names. Both arms keep the shipped read-back of every drug name and differ only in the pair rule: without it the agent reads back morphine and a reflex yes orders it; with it the agent names both drugs, a yes does not confirm, and the caller naming hydromorphone corrects the order",
    differsBy: PAIR_RULE_FLAG,
    outcomes,
    disclaimer:
      "technology demonstration, not a medical device; synthetic data only, no real patients and no real prescriptions",
  })
}

const scenarioSchema = z.object({
  scenario: z.enum(DEMO_SCENARIOS),
})

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "the request body was not valid JSON" }, { status: 400 })
  }
  const parsed = scenarioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: `scenario must be one of ${DEMO_SCENARIOS.join(", ")}` },
      { status: 400 },
    )
  }
  const result = runScenario({
    scenario: parsed.data.scenario,
    catalog: toolCatalog(),
    sessionId: `demo-${Date.now()}`,
  })
  return NextResponse.json({
    ...result,
    disclaimer:
      "technology demonstration, not a medical device; synthetic data only, no real patients and no real prescriptions",
  })
}
