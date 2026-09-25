import { CLOSE_FRAME_TYPE, type TappedFrame } from "@/realtime/frame-tap"

export const AgentActivity = {
  Offline: "OFFLINE",
  Listening: "LISTENING",
  Thinking: "THINKING",
  Speaking: "SPEAKING",
} as const

export type AgentActivity = (typeof AgentActivity)[keyof typeof AgentActivity]

const TRANSITIONS: Readonly<Record<string, AgentActivity>> = Object.freeze({
  "session.created": AgentActivity.Listening,
  "session.updated": AgentActivity.Listening,
  "input.speech.started": AgentActivity.Listening,
  "input.speech.stopped": AgentActivity.Thinking,
  "reply.started": AgentActivity.Speaking,
  "reply.done": AgentActivity.Listening,
  "session.ended": AgentActivity.Offline,
  [CLOSE_FRAME_TYPE]: AgentActivity.Offline,
})

export function agentActivityOf(frames: readonly TappedFrame[]): AgentActivity {
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    const frame = frames[index]
    if (frame === undefined || frame.socket !== "agent" || frame.direction !== "in") {
      continue
    }
    const next = TRANSITIONS[frame.type]
    if (next !== undefined) {
      return next
    }
  }
  return AgentActivity.Offline
}

export const ACTIVITY_LABEL: Readonly<Record<AgentActivity, string>> = Object.freeze({
  OFFLINE: "Agent socket not open",
  LISTENING: "Agent is listening",
  THINKING: "Caller stopped; the agent is working out a reply",
  SPEAKING: "Agent is speaking; the recognizer is muted",
})
