import type { FieldCandidate } from "./candidate"
import type { GateDecision } from "./decision"
import type { LiveOrderSnapshot } from "./live/live-contract"
import type { SocketName } from "./live/socket-params"

export const LIVE_RECORDING_SCHEMA = "readback-live-recording/1"

export const LatencyInterval = {
  TurnToDecision: "turn_to_decision",
  TurnToAudio: "turn_to_audio",
  DecisionToAudio: "decision_to_audio",
} as const

export type LatencyInterval = (typeof LatencyInterval)[keyof typeof LatencyInterval]

export type LatencySample = {
  readonly interval: LatencyInterval
  readonly turnOrder: number
  readonly ms: number
}

export type RecordedFrame = {
  readonly socket: SocketName
  readonly direction: "in" | "out"
  readonly atMs: number
  readonly frame: unknown
}

export type AudioMark = {
  readonly atMs: number
  readonly byteOffset: number
}

export type RecordedState = {
  readonly atMs: number
  readonly candidates: readonly FieldCandidate[]
  readonly decisions: readonly GateDecision[]
  readonly snapshot: LiveOrderSnapshot | null
}

export type LiveRecording = {
  readonly schema: typeof LIVE_RECORDING_SCHEMA
  readonly recordedAt: string
  readonly sessionId: string | null
  readonly sttModel: string | null
  readonly frames: readonly RecordedFrame[]
  readonly states: readonly RecordedState[]
  readonly latency: readonly LatencySample[]
  readonly audio: {
    readonly caller: string | null
    readonly agent: string | null
    readonly callerMarks: readonly AudioMark[]
    readonly agentMarks: readonly AudioMark[]
  }
}
