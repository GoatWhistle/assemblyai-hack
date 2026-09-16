import type { GateDecision } from "./decision"
import type { FieldName } from "./enums"
import type { ReasonCode } from "./reason-codes"

export type MetricKind =
  | "session_started"
  | "turn_received"
  | "field_proposed"
  | "gate_decided"
  | "read_back_requested"
  | "read_back_matched"
  | "read_back_failed"
  | "spell_out_entered"
  | "escalated"
  | "order_committed"
  | "order_refused"
  | "socket_closed"
  | "echo_turn_discarded"

export type MetricEvent = {
  readonly kind: MetricKind
  readonly sessionId: string
  readonly atMs: number
  readonly field: FieldName | null
  readonly reasonCode: ReasonCode | null
  readonly detail: Readonly<Record<string, string | number | boolean | null>>
}

export type CloseInfo = {
  readonly code: number
  readonly reason: string
  readonly socket: "stt" | "agent"
}

export type SessionRecord = {
  readonly sessionId: string
  readonly startedAt: string
  readonly endedAt: string | null
  readonly decisions: readonly GateDecision[]
  readonly events: readonly MetricEvent[]
  readonly closes: readonly CloseInfo[]
  readonly gateEnabled: boolean
}

export type SessionSummary = {
  readonly sessionId: string
  readonly startedAt: string
  readonly endedAt: string | null
  readonly decisionCount: number
  readonly askCount: number
  readonly acceptCount: number
  readonly lasaCatchCount: number
}
