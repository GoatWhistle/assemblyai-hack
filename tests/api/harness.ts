import { catalogFromFile } from "@/catalog"
import { type AgentTurn, makeWordSpan } from "@/domain"
import {
  createMemoryEventStore,
  type IntakeOutcome,
  type IntakeState,
  installIntakeEventStore,
  recordIntakeEvent,
  registerIntake,
  requireRegisteredIntake,
  SESSION_QUERY_PARAM,
  setConfirmationWait,
  setQuotationWait,
  setToolCatalog,
  TOOL_SECRET_HEADER,
} from "@/tools"
import fixture from "../../eval/fixtures/catalog-fixture.json"

export const SECRET = "test-tool-secret"
export const SESSION = "api-test-session"
export const AGENT = "agent-api-test"

let nextReply = 1

export function call(
  path: string,
  body: unknown,
  secret: string | null = SECRET,
  sid: string | null = SESSION,
): Request {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (secret !== null) {
    headers[TOOL_SECRET_HEADER] = secret
  }
  const url = new URL(`https://readback.example.com/api/tools/${path}`)
  if (sid !== null) {
    url.searchParams.set(SESSION_QUERY_PARAM, sid)
  }
  return new Request(url, { method: "POST", headers, body: JSON.stringify(body) })
}

async function nextTurnOrder(session: string): Promise<number> {
  const state = await requireRegisteredIntake(session)
  return state.turns.reduce((max, turn) => Math.max(max, turn.turnOrder), 0) + 1
}

export async function seedTurn(
  text: string,
  confidence: number,
  order?: number,
  session = SESSION,
): Promise<IntakeOutcome> {
  const turnOrder = order ?? (await nextTurnOrder(session))
  const { outcome } = await recordIntakeEvent(session, {
    type: "caller_turn",
    atMs: Date.now(),
    turn: {
      turnOrder,
      transcript: text,
      isFormatted: false,
      words: text.split(" ").map((word, i) => ({
        ...makeWordSpan({
          text: word,
          startMs: 1000 * turnOrder + i * 300,
          endMs: 1000 * turnOrder + i * 300 + 250,
          confidence,
        }),
      })),
    },
  })
  return outcome
}

export async function sayAgent(
  text: string,
  overrides: Partial<Omit<AgentTurn, "role" | "text">> = {},
  session = SESSION,
): Promise<IntakeOutcome> {
  const turn: AgentTurn = {
    role: "agent",
    replyId: overrides.replyId ?? `reply-${nextReply++}`,
    text,
    status: overrides.status ?? "completed",
    playedMs: overrides.playedMs ?? 2000,
    durationMs: overrides.durationMs ?? 2000,
  }
  const { outcome } = await recordIntakeEvent(session, {
    type: "agent_turn",
    atMs: Date.now(),
    turn,
  })
  return outcome
}

export async function callerSays(
  text: string,
  confidence = 0.99,
  session = SESSION,
): Promise<IntakeOutcome> {
  return seedTurn(text, confidence, undefined, session)
}

export async function readBackAloud(
  readBackText: string,
  callerAnswer: string,
  session = SESSION,
): Promise<void> {
  await sayAgent(readBackText, {}, session)
  await callerSays(callerAnswer, 0.99, session)
}

export async function intake(session = SESSION): Promise<IntakeState> {
  return requireRegisteredIntake(session)
}

export async function registerSession(session: string, agentId = AGENT): Promise<void> {
  await registerIntake({ sessionId: session, agentId })
}

export async function resetToolEnvironment(): Promise<void> {
  process.env.AGENT_TOOL_SECRET = SECRET
  setToolCatalog(catalogFromFile(fixture))
  installIntakeEventStore(createMemoryEventStore())
  setConfirmationWait({ timeoutMs: 0, pollMs: 1 })
  setQuotationWait({ timeoutMs: 0, pollMs: 1 })
  nextReply = 1
  await registerSession(SESSION)
}

export const TOOL_RESPONSE_LIMIT = 8 * 1024

export function responseBytes(body: unknown): number {
  return Buffer.byteLength(JSON.stringify(body), "utf8")
}

export function refusalText(body: unknown): string {
  const payload = body as {
    error?: unknown
    rejected_arguments?: readonly { argument?: unknown; problem?: unknown }[]
  }
  const parts = [String(payload.error ?? "")]
  for (const issue of payload.rejected_arguments ?? []) {
    parts.push(String(issue.argument ?? ""), String(issue.problem ?? ""))
  }
  return parts.join(" ")
}
