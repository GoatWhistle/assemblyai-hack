import type { TurnWord } from "@/domain"

export type SttTurn = {
  type: "Turn"
  turn_order: number
  turn_is_formatted: boolean
  end_of_turn: boolean
  transcript: string
  end_of_turn_confidence: number
  words: TurnWord[]
}

export type SttBegin = {
  type: "Begin"
  id: string
  expires_at: number
}

export type SttTermination = {
  type: "Termination"
  audio_duration_seconds: number
  session_duration_seconds: number
}

export type SttMessage = SttBegin | SttTurn | SttTermination

type AgentTranscript = {
  type: "transcript.user" | "transcript.agent"
  text: string
  turn_order?: number
}

type AgentAudio = {
  type: "audio"
  audio: string
}

type AgentLifecycle = {
  type:
    | "session.created"
    | "session.updated"
    | "session.ended"
    | "reply.started"
    | "reply.done"
    | "input.speech.started"
    | "input.speech.stopped"
}

type AgentError = {
  type: "error"
  error: { code: string; message: string }
}

export type AgentMessage = AgentTranscript | AgentAudio | AgentLifecycle | AgentError

export type FixtureFrame = {
  atMs: number
  socket: "stt" | "agent"
  direction: "in" | "out"
  message: SttMessage | AgentMessage
}

export type SessionFixture = {
  name: string
  description: string
  recordedAt: string
  sessionId: string
  frames: FixtureFrame[]
}

export function isSttTurn(message: SttMessage): message is SttTurn {
  return message.type === "Turn"
}
