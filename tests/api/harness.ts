import { catalogFromFile } from "@/catalog"
import { makeWordSpan } from "@/domain"
import { intakeFor, recordTurn, resetIntake, setToolCatalog, TOOL_SECRET_HEADER } from "@/tools"
import fixture from "../../eval/fixtures/catalog-fixture.json"

export const SECRET = "test-tool-secret"
export const SESSION = "api-test-session"

export function call(path: string, body: unknown, secret: string | null = SECRET): Request {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (secret !== null) {
    headers[TOOL_SECRET_HEADER] = secret
  }
  return new Request(`https://readback.example.com/api/tools/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

export function seedTurn(text: string, confidence: number, turnOrder = 1): void {
  const state = intakeFor(SESSION)
  recordTurn(state, {
    turnOrder,
    transcript: text,
    isFormatted: false,
    words: text.split(" ").map((word, i) =>
      makeWordSpan({
        text: word,
        startMs: 1000 * turnOrder + i * 300,
        endMs: 1000 * turnOrder + i * 300 + 250,
        confidence,
      }),
    ),
  })
}

export function resetToolEnvironment(): void {
  process.env.AGENT_TOOL_SECRET = SECRET
  setToolCatalog(catalogFromFile(fixture))
  resetIntake()
}

export const TOOL_RESPONSE_LIMIT = 8 * 1024

export function responseBytes(body: unknown): number {
  return Buffer.byteLength(JSON.stringify(body), "utf8")
}
