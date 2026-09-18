import type { TurnWord } from "@/domain"
import type { FixtureFrame, SessionFixture, SttTurn } from "@/realtime/protocol"

export type WordSpec = readonly [text: string, confidence: number]

export function words(specs: readonly WordSpec[], startMs: number): TurnWord[] {
  let cursor = startMs
  return specs.map(([text, confidence]) => {
    const duration = 120 + text.length * 45
    const word: TurnWord = {
      text,
      start: cursor,
      end: cursor + duration,
      confidence,
      speaker: "A",
      word_is_final: true,
    }
    cursor += duration + 70
    return word
  })
}

export function turn(input: {
  turnOrder: number
  specs: readonly WordSpec[]
  startMs: number
  formatted?: boolean
  endOfTurn?: boolean
  turnConfidence?: number
}): SttTurn {
  const list = words(input.specs, input.startMs)
  return {
    type: "Turn",
    turn_order: input.turnOrder,
    turn_is_formatted: input.formatted ?? false,
    end_of_turn: input.endOfTurn ?? true,
    transcript: list.map((w) => w.text).join(" "),
    end_of_turn_confidence: input.turnConfidence ?? 0.95,
    words: list,
  }
}

export function begin(atMs: number, sessionId: string): FixtureFrame {
  return {
    atMs,
    socket: "stt",
    direction: "in",
    message: { type: "Begin", id: sessionId, expires_at: 1789000000 },
  }
}

export function sttFrame(atMs: number, message: SttTurn): FixtureFrame {
  return { atMs, socket: "stt", direction: "in", message }
}

export function agentFrame(atMs: number, message: FixtureFrame["message"]): FixtureFrame {
  return { atMs, socket: "agent", direction: "in", message }
}

export function created(atMs: number): FixtureFrame {
  return agentFrame(atMs, { type: "session.created" })
}

export function agentSays(atMs: number, text: string): readonly FixtureFrame[] {
  return [
    agentFrame(atMs, { type: "reply.started" }),
    agentFrame(atMs + 40, { type: "transcript.agent", text }),
    agentFrame(atMs + 900, { type: "reply.done" }),
  ]
}

export function userSaid(atMs: number, text: string, turnOrder: number): FixtureFrame {
  return agentFrame(atMs, { type: "transcript.user", text, turn_order: turnOrder })
}

export function ended(atMs: number): readonly FixtureFrame[] {
  return [
    agentFrame(atMs, { type: "session.ended" }),
    {
      atMs: atMs + 20,
      socket: "stt",
      direction: "in",
      message: {
        type: "Termination",
        audio_duration_seconds: Math.round(atMs / 1000),
        session_duration_seconds: Math.round(atMs / 1000) + 2,
      },
    },
  ]
}

export function fixture(input: {
  name: string
  description: string
  frames: readonly FixtureFrame[]
}): SessionFixture {
  return {
    name: input.name,
    description: input.description,
    recordedAt: "2026-09-15T12:00:00.000Z",
    sessionId: `fixture-${input.name}`,
    frames: [...input.frames],
  }
}
