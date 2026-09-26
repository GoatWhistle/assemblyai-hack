import {
  isAdvisoryFault,
  type SessionFault,
  SessionPhase,
} from "@/features/intake/session-status"

export const MicState = {
  Idle: "idle",
  Opening: "opening",
  Listening: "listening",
  AgentSpeaking: "agent_speaking",
  Closing: "closing",
  Blocked: "blocked",
} as const

export type MicState = (typeof MicState)[keyof typeof MicState]

export type MicCopy = {
  readonly headline: string
  readonly detail: string
  readonly action: string
}

export const MIC_COPY: Readonly<Record<MicState, MicCopy>> = Object.freeze({
  [MicState.Idle]: {
    headline: "Start a call",
    detail: "Your microphone opens and the agent takes the order one field at a time.",
    action: "Start listening",
  },
  [MicState.Opening]: {
    headline: "Connecting",
    detail:
      "Allow the microphone if your browser asks. Nothing is captured until the line is open.",
    action: "Cancel",
  },
  [MicState.Listening]: {
    headline: "Listening",
    detail: "Speak the prescription. Every value is checked before it can enter the order.",
    action: "Stop listening",
  },
  [MicState.AgentSpeaking]: {
    headline: "The agent is speaking",
    detail: "Your microphone is held closed on purpose, so the agent cannot hear itself.",
    action: "Stop listening",
  },
  [MicState.Closing]: {
    headline: "Ending the call",
    detail: "Waiting for the line to confirm it closed, so nothing keeps running.",
    action: "Ending the call",
  },
  [MicState.Blocked]: {
    headline: "The call could not start",
    detail: "Nothing was recorded. The replay runs without a microphone.",
    action: "Start listening",
  },
})

export function micStateFor(
  phase: SessionPhase,
  agentSpeaking: boolean,
  fault: SessionFault | null,
): MicState {
  if ((fault !== null && !isAdvisoryFault(fault)) || phase === SessionPhase.Blocked) {
    return MicState.Blocked
  }
  if (
    phase === SessionPhase.RequestingMicrophone ||
    phase === SessionPhase.MintingTokens ||
    phase === SessionPhase.Reconnecting
  ) {
    return MicState.Opening
  }
  if (phase === SessionPhase.Closing) {
    return MicState.Closing
  }
  if (phase === SessionPhase.Live) {
    return agentSpeaking ? MicState.AgentSpeaking : MicState.Listening
  }
  return MicState.Idle
}

export function isBusy(state: MicState): boolean {
  return state === MicState.Opening || state === MicState.Closing
}

export function isCancellable(state: MicState): boolean {
  return state === MicState.Opening
}

export function isOpen(state: MicState): boolean {
  return state === MicState.Listening || state === MicState.AgentSpeaking
}
