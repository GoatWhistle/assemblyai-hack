import { type AgentMessage, type ReplyStatus, replyStatusOf } from "./protocol"

export type AgentDispatchEvents = {
  onReady?: (sessionId: string) => void
  onUserTranscript?: (text: string) => void
  onAgentTranscript?: (text: string, replyId: string | null, interrupted: boolean) => void
  onReplyStarted?: (replyId: string | null) => void
  onReplyDone?: (status: ReplyStatus | null, replyId: string | null) => void
  onReplyAudio?: (base64: string) => void
  onSpeechStarted?: () => void
  onSpeechStopped?: () => void
  onAgentError?: (code: string, message: string) => void
  onSessionEnded?: () => void
  onError?: (error: unknown) => void
}

function dispatchTyped(
  message: AgentMessage & { audio?: string },
  events: AgentDispatchEvents,
): void {
  switch (message.type) {
    case "session.created":
    case "session.updated":
      return
    case "session.ended":
      events.onSessionEnded?.()
      return
    case "reply.started":
      events.onReplyStarted?.(message.reply_id ?? null)
      return
    case "reply.done":
      events.onReplyDone?.(replyStatusOf(message.status), message.reply_id ?? null)
      return
    case "input.speech.started":
      events.onSpeechStarted?.()
      return
    case "input.speech.stopped":
      events.onSpeechStopped?.()
      return
    case "transcript.user":
      events.onUserTranscript?.(message.text)
      return
    case "transcript.agent":
      events.onAgentTranscript?.(
        message.text,
        message.reply_id ?? null,
        message.interrupted === true,
      )
      return
    case "audio":
      events.onReplyAudio?.(message.audio)
      return
    case "error":
      events.onAgentError?.(message.error.code, message.error.message)
      return
    default: {
      const exhaustive: never = message
      void exhaustive
    }
  }
}

export function dispatchRaw(data: string, events: AgentDispatchEvents): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch (error) {
    events.onError?.(error)
    return
  }
  if (typeof parsed !== "object" || parsed === null) {
    return
  }
  const record = parsed as Record<string, unknown>
  if (typeof record.type !== "string") {
    return
  }
  if (typeof record.data === "string" && record.type.startsWith("reply.audio")) {
    events.onReplyAudio?.(record.data)
    return
  }
  if (typeof record.session_id === "string" && record.type.startsWith("session.")) {
    events.onReady?.(record.session_id)
  }
  dispatchTyped(parsed as AgentMessage & { audio?: string }, events)
}

export function buildSessionUpdate(session: {
  readonly agentId?: string
  readonly systemPrompt?: string
  readonly greeting?: string
  readonly keyterms?: readonly string[]
  readonly turnDetection?: {
    readonly vadThreshold?: number
    readonly interruptResponse?: boolean
  }
}): Record<string, unknown> {
  if (session.agentId !== undefined) {
    return { agent_id: session.agentId }
  }
  const turn = session.turnDetection
  const payload: Record<string, unknown> = {
    input: {
      format: { encoding: "audio/pcm" },
      ...(session.keyterms === undefined ? {} : { keyterms: [...session.keyterms] }),
      ...(turn === undefined
        ? {}
        : {
            turn_detection: {
              ...(turn.vadThreshold === undefined ? {} : { vad_threshold: turn.vadThreshold }),
              ...(turn.interruptResponse === undefined
                ? {}
                : { interrupt_response: turn.interruptResponse }),
            },
          }),
    },
  }
  if (session.systemPrompt !== undefined) {
    payload.system_prompt = session.systemPrompt
  }
  if (session.greeting !== undefined) {
    payload.greeting = session.greeting
  }
  payload.output = { format: { encoding: "audio/pcm" } }
  return payload
}
