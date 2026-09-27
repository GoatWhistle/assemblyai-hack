import { CloseCode, type CloseExplanation } from "@/realtime/close-codes"

export const SessionPhase = {
  Idle: "idle",
  RequestingMicrophone: "requesting_microphone",
  MintingTokens: "minting_tokens",
  Live: "live",
  Closing: "closing",
  Closed: "closed",
  Blocked: "blocked",
  Reconnecting: "reconnecting",
  Degraded: "degraded",
} as const

export type SessionPhase = (typeof SessionPhase)[keyof typeof SessionPhase]

export const PHASE_LABEL: Readonly<Record<SessionPhase, string>> = Object.freeze({
  [SessionPhase.Idle]: "Ready",
  [SessionPhase.RequestingMicrophone]: "Asking for the microphone",
  [SessionPhase.MintingTokens]: "Connecting",
  [SessionPhase.Live]: "Live",
  [SessionPhase.Closing]: "Ending the call",
  [SessionPhase.Closed]: "Call ended",
  [SessionPhase.Blocked]: "Could not start",
  [SessionPhase.Reconnecting]: "Reconnecting",
  [SessionPhase.Degraded]: "Call stopped",
})

export const PHASE_TECHNICAL: Readonly<Record<SessionPhase, string>> = Object.freeze({
  [SessionPhase.Idle]: "Not connected",
  [SessionPhase.RequestingMicrophone]: "Asking for the microphone",
  [SessionPhase.MintingTokens]: "Minting short-lived tokens",
  [SessionPhase.Live]: "Live on both sockets",
  [SessionPhase.Closing]: "Closing and waiting for confirmation",
  [SessionPhase.Closed]: "Closed cleanly",
  [SessionPhase.Blocked]: "Cannot start",
  [SessionPhase.Reconnecting]: "Reconnecting with a fresh token",
  [SessionPhase.Degraded]: "Stopped after a failed reconnect",
})

export function phaseLabel(phase: SessionPhase, fault: SessionFault | null): string {
  if (phase === SessionPhase.Blocked && isMicrophoneFault(fault)) {
    return "Microphone blocked"
  }
  return PHASE_LABEL[phase]
}

export function isRestartable(phase: SessionPhase): boolean {
  return (
    phase === SessionPhase.Idle ||
    phase === SessionPhase.Closed ||
    phase === SessionPhase.Degraded
  )
}

export const SessionFault = {
  MicrophoneDenied: "microphone_denied",
  MicrophoneAbsent: "microphone_absent",
  MicrophoneBusy: "microphone_busy",
  InsecureContext: "insecure_context",
  TokenFailed: "token_failed",
  SocketDropped: "socket_dropped",
  CreditsExhausted: "credits_exhausted",
  ConcurrencyReached: "concurrency_reached",
  ModelMismatch: "model_mismatch",
  ReplyStalled: "reply_stalled",
  IdleEnded: "idle_ended",
  ReconnectFailed: "reconnect_failed",
  BudgetExhausted: "budget_exhausted",
  AgentReported: "agent_reported",
  SocketParamRefused: "socket_param_refused",
  CaptureFailed: "capture_failed",
  ConnectTimedOut: "connect_timed_out",
  SocketUnreachable: "socket_unreachable",
} as const

export type SessionFault = (typeof SessionFault)[keyof typeof SessionFault]

const MICROPHONE_FAULTS: readonly SessionFault[] = [
  SessionFault.MicrophoneDenied,
  SessionFault.MicrophoneAbsent,
  SessionFault.MicrophoneBusy,
  SessionFault.InsecureContext,
  SessionFault.CaptureFailed,
]

export function isMicrophoneFault(fault: SessionFault | null): boolean {
  return fault !== null && MICROPHONE_FAULTS.includes(fault)
}

const ADVISORY_FAULTS: readonly SessionFault[] = [
  SessionFault.ReplyStalled,
  SessionFault.AgentReported,
  SessionFault.SocketParamRefused,
]

const SPENT_FAULTS: readonly SessionFault[] = [
  SessionFault.CreditsExhausted,
  SessionFault.BudgetExhausted,
]

export function degradesToReplay(fault: SessionFault | null): boolean {
  return fault !== null && SPENT_FAULTS.includes(fault)
}

export function isAdvisoryFault(fault: SessionFault | null): boolean {
  return fault !== null && ADVISORY_FAULTS.includes(fault)
}

const NON_RETRYABLE_CLOSES: readonly number[] = [
  CloseCode.PolicyViolation,
  CloseCode.MalformedConfiguration,
  CloseCode.MalformedChunks,
  CloseCode.ThreeHourCap,
  CloseCode.SessionLimit,
]

export function isRetryableClose(explanation: CloseExplanation): boolean {
  return !NON_RETRYABLE_CLOSES.includes(explanation.code)
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
  readonly lead?: string
}

export const FAULT_COPY: Readonly<Record<SessionFault, FaultCopy>> = Object.freeze({
  [SessionFault.MicrophoneDenied]: {
    title: "Microphone permission was refused",
    body: "The browser asked and the answer was no. It will not ask twice on its own, so nothing can be transcribed until permission is granted again.",
    remedy:
      "Grant microphone access for this site and start again, or open the replay demonstration, which needs no microphone at all.",
  },
  [SessionFault.MicrophoneAbsent]: {
    title: "No microphone was found",
    body: "The browser reported no input device at all, which is different from a refusal: there is nothing here to grant permission to.",
    remedy: "Connect a microphone and start again, or open the replay demonstration instead.",
  },
  [SessionFault.MicrophoneBusy]: {
    title: "The microphone is in use elsewhere",
    body: "A device was found but could not be opened, which usually means another application or browser tab is already holding it.",
    remedy:
      "Close whatever else is using the microphone and start again, or open the replay demonstration instead.",
  },
  [SessionFault.CaptureFailed]: {
    title: "The microphone opened but its audio could not be captured",
    body: "The browser granted the microphone, but the audio processor that turns it into frames for the two sockets failed to load, so nothing you say would reach the recognizer. Both sockets were closed at once rather than left open and billing.",
    remedy: "Reload the page and start again, or open the replay demonstration instead.",
  },
  [SessionFault.InsecureContext]: {
    title: "This page is not served over HTTPS",
    body: "Browsers withhold microphone access outside a secure context, so this has nothing to do with the device itself.",
    remedy: "Open this page over HTTPS, or open the replay demonstration instead.",
  },
  [SessionFault.TokenFailed]: {
    title: "A short-lived token could not be minted",
    body: "The browser never holds the API key; it asks our own route for a single-use token. That request did not return one.",
    remedy:
      "Check that the server has its key configured, then start again to mint a fresh token.",
  },
  [SessionFault.ConnectTimedOut]: {
    title: "The line did not open",
    body: "Neither the token route nor the two sockets answered within 15 seconds, so the attempt was abandoned instead of spinning on. Nothing was recorded, and a socket that opens late is closed at once.",
    remedy: "Try again, or watch the replay, which needs no connection at all.",
  },
  [SessionFault.SocketUnreachable]: {
    title: "The speech service could not be reached",
    body: "Both short-lived tokens were issued, but the browser could not open its connection to AssemblyAI. The browser does not say whether the network blocked it or the service refused it. It failed before any audio was sent, so nothing was recorded, and a socket that did open was closed at once.",
    remedy:
      "Check the network, and whether a firewall, VPN or proxy blocks secure WebSocket (wss) connections to assemblyai.com, then start again: every start mints fresh tokens. The replay demonstration needs no connection.",
  },
  [SessionFault.SocketDropped]: {
    title: "A socket dropped",
    body: "Tokens are single-use, so a reconnect mints a new one rather than reusing the old. Reusing one fails quietly, which is worse than failing loudly.",
    remedy: "Reconnect to mint a fresh token and open a new session.",
  },
  [SessionFault.CreditsExhausted]: {
    title: "The account is out of credit",
    lead: "This project's AssemblyAI credit has run out, so no live call can start. Nothing was billed to you.",
    body: "Live calls spend this project's AssemblyAI credit, never yours, and it has run out. Two sockets bill at once while a session is open, and billing runs on socket lifetime rather than audio volume.",
    remedy: "Use the replay demonstration, which replays a session without opening a socket.",
  },
  [SessionFault.ConcurrencyReached]: {
    title: "Too many sessions at once",
    body: "The free tier allows five new sessions per minute and each run opens two sockets. A second visitor starting at the same moment is enough to hit it.",
    remedy: "Wait about half a minute and start again, or use the replay demonstration.",
  },
  [SessionFault.ModelMismatch]: {
    title: "The recognizer started a different model",
    body: "We ask for universal-3-5-pro, and the socket's opening message reported another model. Every word's provenance would then come from a model we did not choose, so the session was closed rather than trusted.",
    remedy:
      "Start again. If it repeats, the vendor has changed the default and the pinned model needs to be reviewed.",
  },
  [SessionFault.ReplyStalled]: {
    title: "The agent's reply never finished",
    body: "Your microphone is muted towards the recognizer while the agent speaks, so it cannot hear itself. The reply stopped sending audio for 20 seconds without finishing, so the microphone was reopened rather than left deaf.",
    remedy: "Keep talking; if the agent stays silent, stop and start again.",
  },
  [SessionFault.IdleEnded]: {
    title: "The line was closed after 90 seconds of silence",
    body: "Nobody spoke and the agent did not reply for 90 seconds. Both sockets bill for as long as they are open, so an idle line is closed rather than left running.",
    remedy: "Start again when you are ready to dictate.",
  },
  [SessionFault.ReconnectFailed]: {
    title: "The connection dropped twice",
    body: "A socket closed unexpectedly, and one reconnect with a freshly minted token was tried. It dropped again, so the session was stopped instead of retrying without end.",
    remedy: "Start again, or use the replay demonstration if the network is unreliable.",
  },
  [SessionFault.BudgetExhausted]: {
    title: "The live-call budget refused this call",
    lead: "A live-call budget cap refused this call, so no token was issued and nothing was billed. The daily budget resets at 00:00 UTC.",
    body: "Live calls run on this project's own AssemblyAI credit, not on yours. The server caps the socket-seconds it mints per day, and how much of that one visitor may use, so no single visitor can spend it for everyone. A cap refused this call, so no token was issued and nothing was billed; the line below says which one.",
    remedy:
      "Use the replay demonstration, which runs the same gate without opening a socket, or come back after the daily reset.",
  },
  [SessionFault.AgentReported]: {
    title: "The agent reported an error",
    body: "The voice agent sent an error frame instead of a reply. Nothing was said or written in its place: a failed step is shown as failed, never filled in with a guess.",
    remedy: "Repeat the last thing you said. If the error repeats, stop and start again.",
  },
  [SessionFault.SocketParamRefused]: {
    title: "A socket setting was refused before it was sent",
    body: "Every parameter is checked against the list the vendor documents for that socket. An unknown one is answered by a close code in the middle of a session rather than by a readable error, so it is stopped here and named instead.",
    remedy:
      "This is a configuration defect in the product, not something you did. Use the replay demonstration while it is fixed.",
  },
})
