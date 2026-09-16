import { NextResponse } from "next/server"
import { runDemo } from "@/sessions"

export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const sessionId = `demo-${Date.now()}`
  const outcomes = runDemo(sessionId)

  return NextResponse.json({
    sessionId,
    description:
      "the human said Lisinopril, the recognizer returned Bisoprolol at confidence 1.0, and the validator passed it; the same candidate is run with the gate on and with the gate off",
    outcomes,
    disclaimer:
      "technology demonstration, not a medical device; synthetic data only, no real patients and no real prescriptions",
  })
}
