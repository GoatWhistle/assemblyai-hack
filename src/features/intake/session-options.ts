import type { AgentTurn, SessionBinding } from "@/domain"
import type { FrameSink } from "@/realtime/frame-tap"
import type { Patience } from "@/realtime/patience"
import type { TransportFactory } from "@/realtime/transport"
import type { CallerTurn } from "./session-events"
import type { SessionFault, SessionPhase } from "./session-status"
import type { Solicited } from "./solicited-field"

export type FaultDetail = { readonly code: string; readonly message: string }

export type SessionHandles = {
  readonly phase: SessionPhase
  readonly fault: SessionFault | null
  readonly faultDetail: FaultDetail | null
  readonly echoDiscards: number
  readonly level: number
  readonly agentSpeaking: boolean
  readonly patience: Patience
  readonly patienceSwitches: number
  readonly sttModel: string | null
  readonly sessionId: string | null
  start: () => Promise<void>
  stop: () => Promise<void>
  finishAnswer: () => void
}

export type UseSessionOptions = {
  readonly onTranscriptTurn?: (turn: CallerTurn, discarded: boolean) => void
  readonly onAgentLine?: (text: string) => void
  readonly onAgentTurn?: (turn: AgentTurn) => void
  readonly onSessionBound?: (binding: SessionBinding) => void
  readonly onSessionClosed?: (sessionId: string) => void
  readonly onEchoDiscarded?: (overlap: number) => void
  readonly onFrame?: FrameSink
  readonly onRecognizerModel?: (model: string | null) => void
  readonly onCallerAudio?: (bytes: Uint8Array) => void
  readonly onAgentAudio?: (base64: string) => void
  readonly solicited?: Solicited
  readonly transport?: TransportFactory
}
