import { SessionFault } from "./session-status"

export type FaultSteps = {
  readonly steps: readonly string[]
  readonly note?: string
}

const REPLAY_INSTEAD = "Or open the replay demonstration instead."

export const FAULT_STEPS: Readonly<Record<SessionFault, FaultSteps>> = Object.freeze({
  [SessionFault.MicrophoneDenied]: {
    steps: ["Grant microphone access for this site.", "Start again."],
    note: "Or open the replay demonstration, which needs no microphone at all.",
  },
  [SessionFault.MicrophoneAbsent]: {
    steps: ["Connect a microphone.", "Start again."],
    note: REPLAY_INSTEAD,
  },
  [SessionFault.MicrophoneBusy]: {
    steps: ["Close whatever else is using the microphone.", "Start again."],
    note: REPLAY_INSTEAD,
  },
  [SessionFault.CaptureFailed]: {
    steps: ["Reload the page.", "Start again."],
    note: REPLAY_INSTEAD,
  },
  [SessionFault.InsecureContext]: {
    steps: ["Open this page over HTTPS."],
    note: REPLAY_INSTEAD,
  },
  [SessionFault.TokenFailed]: {
    steps: [
      "Check that the server has its key configured.",
      "Start again to mint a fresh token.",
    ],
  },
  [SessionFault.ConnectTimedOut]: {
    steps: ["Try again."],
    note: "Or watch the replay, which needs no connection at all.",
  },
  [SessionFault.SocketUnreachable]: {
    steps: [
      "Check the network, and whether a firewall, VPN or proxy blocks secure WebSocket (wss) connections to assemblyai.com.",
      "Start again: every start mints fresh tokens.",
    ],
    note: "The replay demonstration needs no connection.",
  },
  [SessionFault.SocketDropped]: {
    steps: ["Reconnect to mint a fresh token and open a new session."],
  },
  [SessionFault.CreditsExhausted]: {
    steps: ["Use the replay demonstration, which replays a session without opening a socket."],
  },
  [SessionFault.ConcurrencyReached]: {
    steps: ["Wait about half a minute.", "Start again."],
    note: "Or use the replay demonstration.",
  },
  [SessionFault.ModelMismatch]: {
    steps: [
      "Start again.",
      "If it repeats, the vendor has changed the default and the pinned model needs to be reviewed.",
    ],
  },
  [SessionFault.ReplyStalled]: {
    steps: ["Keep talking.", "If the agent stays silent, stop and start again."],
  },
  [SessionFault.IdleEnded]: {
    steps: ["Start again when you are ready to dictate."],
  },
  [SessionFault.ReconnectFailed]: {
    steps: ["Start again."],
    note: "Or use the replay demonstration if the network is unreliable.",
  },
  [SessionFault.BudgetExhausted]: {
    steps: ["Use the replay demonstration, which runs the same gate without opening a socket."],
    note: "Or come back after the daily reset.",
  },
  [SessionFault.AgentReported]: {
    steps: ["Repeat the last thing you said.", "If the error repeats, stop and start again."],
  },
  [SessionFault.SocketParamRefused]: {
    steps: ["Use the replay demonstration while it is fixed."],
    note: "This is a configuration defect in the product, not something you did.",
  },
})
