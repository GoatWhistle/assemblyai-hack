import { NextResponse } from "next/server"
import { z } from "zod"
import {
  type AgentTurn,
  type CallerTurnBody,
  type CallerTurnWord,
  ReadbackError,
  type RecognizerReport,
  SessionStorageError,
  UNKNOWN_SESSION_CODE,
  UnknownSessionError,
  usableSessionId,
  type WordSpan,
  wordSpanFromTurnWord,
} from "@/domain"
import { type IntakeEvent, orderSnapshot, recordIntakeEvent } from "@/tools"
import {
  MAX_UTTERANCE_CHARS,
  MAX_VALUE_CHARS,
  stripControlCharacters,
} from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

export const maxDuration = 30

export const MAX_WORDS_PER_TURN = 200

export const MAX_TIMELINE_MS = 3 * 60 * 60 * 1000

const wordSchema = z.object({
  text: z.string().min(1).max(MAX_VALUE_CHARS).transform(stripControlCharacters),
  start: z.number().finite().nonnegative().max(MAX_TIMELINE_MS),
  end: z.number().finite().nonnegative().max(MAX_TIMELINE_MS),
  confidence: z.number().min(0).max(1),
}) satisfies z.ZodType<CallerTurnWord, z.ZodTypeDef, unknown>

const callerSchema = z.object({
  role: z.literal("caller").optional(),
  turnOrder: z.number().int().nonnegative().max(100_000),
  transcript: z.string().min(1).max(MAX_UTTERANCE_CHARS).transform(stripControlCharacters),
  isFormatted: z.boolean(),
  words: z.array(wordSchema).min(1).max(MAX_WORDS_PER_TURN),
}) satisfies z.ZodType<CallerTurnBody, z.ZodTypeDef, unknown>

const agentSchema = z.object({
  role: z.literal("agent"),
  replyId: z.string().min(1).max(128).transform(stripControlCharacters),
  text: z.string().min(1).max(MAX_UTTERANCE_CHARS).transform(stripControlCharacters),
  status: z.enum(["completed", "interrupted"]),
  playedMs: z.number().finite().nonnegative().max(MAX_TIMELINE_MS),
  durationMs: z.number().finite().nonnegative().max(MAX_TIMELINE_MS),
}) satisfies z.ZodType<AgentTurn, z.ZodTypeDef, unknown>

const recognizerSchema = z.object({
  role: z.literal("recognizer"),
  model: z.string().max(128).transform(stripControlCharacters).nullable(),
  expectedModel: z.string().min(1).max(128).transform(stripControlCharacters),
}) satisfies z.ZodType<RecognizerReport, z.ZodTypeDef, unknown>

type CallerBody = z.infer<typeof callerSchema>

function refusal(error: string, status: number, code?: string): NextResponse {
  return NextResponse.json(code === undefined ? { error } : { error, code }, { status })
}

function firstIssue(error: z.ZodError): string {
  const first = error.issues[0]
  return first === undefined ? "invalid turn" : `${first.path.join(".")}: ${first.message}`
}

function callerEvent(body: CallerBody): IntakeEvent {
  const words: WordSpan[] = body.words.map((word) => wordSpanFromTurnWord(word))
  return {
    type: "caller_turn",
    atMs: Date.now(),
    turn: {
      turnOrder: body.turnOrder,
      transcript: body.transcript,
      isFormatted: body.isFormatted,
      words: words.map((word) => ({ ...word })),
    },
  }
}

function eventFrom(body: unknown): { event: IntakeEvent } | { error: string } {
  const role =
    typeof body === "object" && body !== null ? (body as { role?: unknown }).role : null
  if (role === "recognizer") {
    const parsed = recognizerSchema.safeParse(body)
    if (!parsed.success) {
      return { error: firstIssue(parsed.error) }
    }
    return { event: { type: "recognizer", atMs: Date.now(), ...parsed.data } }
  }
  if (role === "agent") {
    const parsed = agentSchema.safeParse(body)
    if (!parsed.success) {
      return { error: firstIssue(parsed.error) }
    }
    return { event: { type: "agent_turn", atMs: Date.now(), turn: parsed.data } }
  }
  const parsed = callerSchema.safeParse(body)
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) }
  }
  return { event: callerEvent(parsed.data) }
}

function roleOf(event: IntakeEvent): "agent" | "caller" | "recognizer" {
  if (event.type === "agent_turn") {
    return "agent"
  }
  return event.type === "recognizer" ? "recognizer" : "caller"
}

async function recorded(sessionId: string, event: IntakeEvent): Promise<NextResponse> {
  try {
    const { state, outcome } = await recordIntakeEvent(sessionId, event)
    if (outcome.status !== 200) {
      return NextResponse.json(outcome.payload, { status: outcome.status })
    }
    return NextResponse.json({
      sessionId,
      role: roleOf(event),
      turnsHeld: state.turns.length,
      wordsInTurn: event.type === "caller_turn" ? event.turn.words.length : 0,
      candidates: [...state.candidates.values()],
      decisions: state.decisions,
      order: orderSnapshot(state),
      note: "word timings are computed in the browser and are therefore client-supplied; this is a stated limitation of holding the STT socket in the browser",
    })
  } catch (error) {
    if (error instanceof UnknownSessionError) {
      return refusal(error.message, 404, UNKNOWN_SESSION_CODE)
    }
    if (error instanceof SessionStorageError) {
      return refusal(error.message, 503, error.code)
    }
    if (error instanceof ReadbackError) {
      return refusal(error.message, 422, error.code)
    }
    throw error
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params
  const sessionId = usableSessionId(stripControlCharacters(id))
  if (sessionId === null) {
    return refusal("the session id is not usable", 400)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return refusal("the request body was not valid JSON", 400)
  }

  let built: { event: IntakeEvent } | { error: string }
  try {
    built = eventFrom(body)
  } catch (error) {
    return refusal(
      error instanceof ReadbackError
        ? error.message
        : "the word timings in that turn were not internally consistent",
      422,
      error instanceof ReadbackError ? error.code : "INVALID_TURN",
    )
  }
  if ("error" in built) {
    return refusal(built.error, 400)
  }

  return recorded(sessionId, built.event)
}
