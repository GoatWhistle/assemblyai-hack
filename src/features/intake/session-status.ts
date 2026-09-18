import { CloseCode, type CloseExplanation } from "@/realtime/close-codes"

export const SessionPhase = {
  Idle: "idle",
  RequestingMicrophone: "requesting_microphone",
  MintingTokens: "minting_tokens",
  Live: "live",
  Closing: "closing",
  Closed: "closed",
  Blocked: "blocked",
} as const

export type SessionPhase = (typeof SessionPhase)[keyof typeof SessionPhase]

export const PHASE_LABEL: Readonly<Record<SessionPhase, string>> = Object.freeze({
  [SessionPhase.Idle]: "Not connected",
  [SessionPhase.RequestingMicrophone]: "Asking for the microphone",
  [SessionPhase.MintingTokens]: "Minting short-lived tokens",
  [SessionPhase.Live]: "Live on both sockets",
  [SessionPhase.Closing]: "Closing and waiting for confirmation",
  [SessionPhase.Closed]: "Closed cleanly",
  [SessionPhase.Blocked]: "Cannot start",
})

export const SessionFault = {
  MicrophoneDenied: "microphone_denied",
  MicrophoneAbsent: "microphone_absent",
  MicrophoneBusy: "microphone_busy",
  InsecureContext: "insecure_context",
  TokenFailed: "token_failed",
  SocketDropped: "socket_dropped",
  CreditsExhausted: "credits_exhausted",
  ConcurrencyReached: "concurrency_reached",
} as const

export type SessionFault = (typeof SessionFault)[keyof typeof SessionFault]

const MICROPHONE_FAULTS: readonly SessionFault[] = [
  SessionFault.MicrophoneDenied,
  SessionFault.MicrophoneAbsent,
  SessionFault.MicrophoneBusy,
  SessionFault.InsecureContext,
]

export function isMicrophoneFault(fault: SessionFault | null): boolean {
  return fault !== null && MICROPHONE_FAULTS.includes(fault)
}

export function faultForClose(explanation: CloseExplanation): SessionFault {
  if (
    explanation.code === CloseCode.PolicyViolation ||
    explanation.code === CloseCode.SessionLimit
  ) {
    return SessionFault.ConcurrencyReached
  }
  return SessionFault.SocketDropped
}

export type FaultCopy = {
  readonly title: string
  readonly body: string
  readonly remedy: string
}

export const FAULT_COPY: Readonly<Record<SessionFault, FaultCopy>> = Object.freeze({
  [SessionFault.MicrophoneDenied]: {
    title: "Microphone permission was refused",
    body: "The browser asked and the answer was no. It will not ask twice on its own, so nothing can be transcribed until permission is granted again.",
    remedy:
      "Grant microphone access for this site and start again, or open the recorded demonstration, which needs no microphone at all.",
  },
  [SessionFault.MicrophoneAbsent]: {
    title: "No microphone was found",
    body: "The browser reported no input device at all, which is different from a refusal: there is nothing here to grant permission to.",
    remedy: "Connect a microphone and start again, or open the recorded demonstration instead.",
  },
  [SessionFault.MicrophoneBusy]: {
    title: "The microphone is in use elsewhere",
    body: "A device was found but could not be opened, which usually means another application or browser tab is already holding it.",
    remedy:
      "Close whatever else is using the microphone and start again, or open the recorded demonstration instead.",
  },
  [SessionFault.InsecureContext]: {
    title: "This page is not served over HTTPS",
    body: "Browsers withhold microphone access outside a secure context, so this has nothing to do with the device itself.",
    remedy: "Open this page over HTTPS, or open the recorded demonstration instead.",
  },
  [SessionFault.TokenFailed]: {
    title: "A short-lived token could not be minted",
    body: "The browser never holds the API key; it asks our own route for a single-use token. That request did not return one.",
    remedy:
      "Check that the server has its key configured, then start again to mint a fresh token.",
  },
  [SessionFault.SocketDropped]: {
    title: "A socket dropped",
    body: "Tokens are single-use, so a reconnect mints a new one rather than reusing the old. Reusing one fails quietly, which is worse than failing loudly.",
    remedy: "Reconnect to mint a fresh token and open a new session.",
  },
  [SessionFault.CreditsExhausted]: {
    title: "The account is out of credit",
    body: "Two sockets bill at once while a session is open, and billing runs on socket lifetime rather than audio volume.",
    remedy: "Use the recorded demonstration, which replays a session without opening a socket.",
  },
  [SessionFault.ConcurrencyReached]: {
    title: "Too many sessions at once",
    body: "The free tier allows five new sessions per minute and each run opens two sockets. A second visitor starting at the same moment is enough to hit it.",
    remedy: "Wait about half a minute and start again, or use the recorded demonstration.",
  },
})

export const DISCLAIMER = {
  title: "This is a technology demonstration, not a medical device",
  body: "Synthetic data only. No real patients, no real prescriptions, and nothing here is clinical advice. The catalogues are public reference data and the gate is a software invariant, not a regulatory approval.",
} as const
