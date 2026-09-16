import { type SessionFault, SessionPhase } from "@/features/intake/session-status"

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
    headline: "Start the intake call",
    detail: "Your microphone opens and the agent takes the order one field at a time.",
    action: "Start listening",
  },
  [MicState.Opening]: {
    headline: "Opening the line",
    detail: "Asking for the microphone and minting a short-lived token for each socket.",
    action: "Opening",
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
    headline: "Closing the line",
    detail: "Waiting for both sockets to confirm they ended, so nothing keeps billing.",
    action: "Closing",
  },
  [MicState.Blocked]: {
    headline: "The line cannot open",
    detail: "Nothing was recorded. The recorded demonstration runs without a microphone.",
    action: "Try again",
  },
})

export function micStateFor(
  phase: SessionPhase,
  agentSpeaking: boolean,
  fault: SessionFault | null,
): MicState {
  if (fault !== null || phase === SessionPhase.Blocked) {
    return MicState.Blocked
  }
  if (phase === SessionPhase.RequestingMicrophone || phase === SessionPhase.MintingTokens) {
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

export function isOpen(state: MicState): boolean {
  return state === MicState.Listening || state === MicState.AgentSpeaking
}
