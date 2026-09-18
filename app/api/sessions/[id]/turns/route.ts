import { NextResponse } from "next/server"
import { z } from "zod"
import { ReadbackError, usableSessionId, wordSpanFromTurnWord } from "@/domain"
import { intakeFor, recordTurn } from "@/tools"
import {
  MAX_UTTERANCE_CHARS,
  MAX_VALUE_CHARS,
  stripControlCharacters,
} from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

export const MAX_WORDS_PER_TURN = 200

export const MAX_TIMELINE_MS = 3 * 60 * 60 * 1000

const wordSchema = z.object({
  text: z.string().min(1).max(MAX_VALUE_CHARS).transform(stripControlCharacters),
  start: z.number().finite().nonnegative().max(MAX_TIMELINE_MS),
  end: z.number().finite().nonnegative().max(MAX_TIMELINE_MS),
  confidence: z.number().min(0).max(1),
})

const schema = z.object({
  turnOrder: z.number().int().nonnegative().max(100_000),
  transcript: z.string().min(1).max(MAX_UTTERANCE_CHARS).transform(stripControlCharacters),
  isFormatted: z.boolean(),
  words: z.array(wordSchema).min(1).max(MAX_WORDS_PER_TURN),
})

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params
  const sessionId = usableSessionId(stripControlCharacters(id))
  if (sessionId === null) {
    return NextResponse.json({ error: "the session id is not usable" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "the request body was not valid JSON" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      {
        error:
          first === undefined ? "invalid turn" : `${first.path.join(".")}: ${first.message}`,
      },
      { status: 400 },
    )
  }

  const state = intakeFor(sessionId)
  try {
    recordTurn(state, {
      turnOrder: parsed.data.turnOrder,
      transcript: parsed.data.transcript,
      isFormatted: parsed.data.isFormatted,
      words: parsed.data.words.map((word) => wordSpanFromTurnWord(word)),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ReadbackError
            ? error.message
            : "the word timings in that turn were not internally consistent",
        code: error instanceof ReadbackError ? error.code : "INVALID_TURN",
      },
      { status: 422 },
    )
  }

  return NextResponse.json({
    sessionId,
    turnsHeld: state.turns.length,
    wordsInTurn: parsed.data.words.length,
    candidates: [...state.candidates.values()],
    decisions: state.decisions,
    note: "word timings are computed in the browser and are therefore client-supplied; this is a stated limitation of holding the STT socket in the browser",
  })
}
