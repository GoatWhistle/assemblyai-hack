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
  TokenFailed: "token_failed",
  SocketDropped: "socket_dropped",
  CreditsExhausted: "credits_exhausted",
  ConcurrencyReached: "concurrency_reached",
} as const

export type SessionFault = (typeof SessionFault)[keyof typeof SessionFault]

export type FaultCopy = {
  readonly title: string
  readonly body: string
  readonly remedy: string
}

export const FAULT_COPY: Readonly<Record<SessionFault, FaultCopy>> = Object.freeze({
  [SessionFault.MicrophoneDenied]: {
    title: "The microphone was refused",
    body: "Nothing can be transcribed without an input device, and the browser will not ask twice on its own.",
    remedy:
      "Grant microphone access for this site and start again, or open the recorded demonstration, which needs no microphone at all.",
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
