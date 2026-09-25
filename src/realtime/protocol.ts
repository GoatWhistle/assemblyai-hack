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

export type SttBeginConfiguration = {
  model?: string | null
  mode?: string | null
  domain?: string | null
  voice_focus?: string | null
}

export type SttBegin = {
  type: "Begin"
  id: string
  expires_at: number
  configuration?: SttBeginConfiguration
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
  reply_id?: string
  interrupted?: boolean
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
    | "input.speech.started"
    | "input.speech.stopped"
}

export type ReplyStatus = "completed" | "interrupted"

type AgentReplyStarted = {
  type: "reply.started"
  reply_id?: string
}

type AgentReplyDone = {
  type: "reply.done"
  reply_id?: string
  status?: string
}

type AgentError = {
  type: "error"
  error: { code: string; message: string }
}

export type AgentMessage =
  | AgentTranscript
  | AgentAudio
  | AgentLifecycle
  | AgentReplyStarted
  | AgentReplyDone
  | AgentError

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

export function replyStatusOf(raw: unknown): ReplyStatus | null {
  if (raw === "completed" || raw === "interrupted") {
    return raw
  }
  return null
}
