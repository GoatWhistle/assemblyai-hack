import { SessionPhase } from "@/features/intake/session-status"
import { ReadBackState } from "@/features/read-back/read-back-machine"

export const WaitingOn = {
  Nobody: "nobody",
  Opening: "opening",
  You: "you",
  YourConfirmation: "your_confirmation",
  TheGate: "the_gate",
  TheAgentSpeaking: "the_agent_speaking",
  Closing: "closing",
} as const

export type WaitingOn = (typeof WaitingOn)[keyof typeof WaitingOn]

export type WaitingSignals = {
  readonly phase: SessionPhase
  readonly agentSpeaking: boolean
  readonly turnInFlight: boolean
  readonly readBackState: ReadBackState
}

export type WaitingCopy = {
  readonly headline: string
  readonly detail: string
  readonly side: "human" | "system" | "neither"
  readonly observedFrom: string
}

export const WAITING_COPY: Readonly<Record<WaitingOn, WaitingCopy>> = Object.freeze({
  [WaitingOn.Nobody]: {
    headline: "Nobody is waiting",
    detail: "The line is not open, so there is no turn to take.",
    side: "neither",
    observedFrom: "the session phase",
  },
  [WaitingOn.Opening]: {
    headline: "The system is opening the line",
    detail:
      "Asking for the microphone and minting a single-use token for each socket. Nothing you say is captured yet.",
    side: "system",
    observedFrom: "the session phase",
  },
  [WaitingOn.You]: {
    headline: "Waiting for you",
    detail: "The line is open and idle. Speak when you are ready; nothing is being processed.",
    side: "human",
    observedFrom: "an open socket with no reply and no turn in flight",
  },
  [WaitingOn.YourConfirmation]: {
    headline: "Waiting for you to confirm it aloud",
    detail:
      "The value was read back and the gate will not write it until you answer. This is your turn, not processing.",
    side: "human",
    observedFrom: "the read-back state",
  },
  [WaitingOn.TheGate]: {
    headline: "The system is checking what you said",
    detail:
      "Your words are with the validators and the gate. Do not repeat yourself: a second utterance becomes a second turn, and both then carry provenance.",
    side: "system",
    observedFrom: "a request to the gate that has not answered",
  },
  [WaitingOn.TheAgentSpeaking]: {
    headline: "The agent has the turn",
    detail:
      "Nothing is being sent to the recognizer until the reply ends, so there is no turn for you to take yet.",
    side: "system",
    observedFrom: "the reply lifecycle on the agent socket",
  },
  [WaitingOn.Closing]: {
    headline: "The system is closing both sockets",
    detail:
      "Waiting for each socket to confirm it ended, because billing runs on socket lifetime.",
    side: "system",
    observedFrom: "the session phase",
  },
})

const AWAITING_VOICE: readonly ReadBackState[] = [
  ReadBackState.AwaitingConfirmation,
  ReadBackState.SpellOut,
]

export function waitingOn(signals: WaitingSignals): WaitingOn {
  if (signals.phase === SessionPhase.Closing) {
    return WaitingOn.Closing
  }
  if (
    signals.phase === SessionPhase.RequestingMicrophone ||
    signals.phase === SessionPhase.MintingTokens
  ) {
    return WaitingOn.Opening
  }
  if (signals.phase !== SessionPhase.Live) {
    return WaitingOn.Nobody
  }
  if (signals.agentSpeaking) {
    return WaitingOn.TheAgentSpeaking
  }
  if (signals.turnInFlight) {
    return WaitingOn.TheGate
  }
  if (AWAITING_VOICE.includes(signals.readBackState)) {
    return WaitingOn.YourConfirmation
  }
  return WaitingOn.You
}

export function isSystemThinking(state: WaitingOn): boolean {
  return WAITING_COPY[state].side === "system"
}

export function isHumanTurn(state: WaitingOn): boolean {
  return WAITING_COPY[state].side === "human"
}
