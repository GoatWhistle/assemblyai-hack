import { matchesServerRecordedAgentLine, type TurnRecord } from "@/confirmation"
import {
  abortField,
  type ConfirmationEvidence,
  type ConfirmedValue,
  EchoTurnError,
  emptyOrder,
  type FieldCandidate,
  type FieldName,
  type GateDecision,
  InvalidWordSpanError,
  type MetricEvent,
  type MetricKind,
  type Order,
  type ReasonCode,
  setField,
  withdrawField,
  withStatus,
} from "@/domain"
import type { TimelineEntry } from "@/sessions"
import type { ToolPayload } from "./respond"

export type ReadBackRegistration = {
  readonly field: FieldName
  readonly candidateId: string
  readonly utterance: string
  readonly style: "plain" | "spell_out"
  readonly sinceMs: number
  readonly answered: boolean
}

export type CommitRefusal = {
  readonly atMs: number
  readonly missing: readonly FieldName[]
  readonly reasonCode: string
}

export type IntakeState = {
  sessionId: string
  agentId: string
  order: Order
  turns: TurnRecord[]
  candidates: Map<string, FieldCandidate>
  decisions: GateDecision[]
  events: MetricEvent[]
  readBack: ReadBackRegistration | null
  escalated: Set<FieldName>
  startedAt: string
  gateEnabled: boolean
  lastAgentLine: string | null
  nowMs: number
  seq: number
  timeline: TimelineEntry[]
  proposalSeq: Map<string, number>
  confirmations: Map<FieldName, ConfirmationEvidence>
  outcomes: Map<number, IntakeOutcome>
  committedSeq: number | null
  committedAtMs: number | null
  actualModel: string | null
  commitRefusals: CommitRefusal[]
}

export type IntakeOutcome = {
  readonly status: number
  readonly payload: ToolPayload
}

export const MAX_TURNS_PER_SESSION = 400

export const MAX_CANDIDATES_PER_SESSION = 200

export const MAX_DECISIONS_PER_SESSION = 400

const MAX_TIMELINE_ENTRIES = 800

const MAX_EVENTS_PER_SESSION = 800

export function recordEvent(
  state: IntakeState,
  kind: MetricKind,
  input: {
    field?: FieldName | null
    reasonCode?: ReasonCode | null
    detail?: Readonly<Record<string, string | number | boolean | null>>
  } = {},
): void {
  state.events.push({
    kind,
    sessionId: state.sessionId,
    atMs: state.nowMs,
    field: input.field ?? null,
    reasonCode: input.reasonCode ?? null,
    detail: input.detail ?? {},
  })
  if (state.events.length > MAX_EVENTS_PER_SESSION) {
    state.events = state.events.slice(-MAX_EVENTS_PER_SESSION)
  }
}

export function createIntakeState(input: {
  sessionId: string
  agentId: string
  gateEnabled: boolean
  atMs: number
}): IntakeState {
  const startedAt = new Date(input.atMs).toISOString()
  const created: IntakeState = {
    sessionId: input.sessionId,
    agentId: input.agentId,
    order: emptyOrder({
      orderId: `order-${input.sessionId}`,
      sessionId: input.sessionId,
      createdAt: startedAt,
    }),
    turns: [],
    candidates: new Map(),
    decisions: [],
    events: [],
    readBack: null,
    escalated: new Set(),
    startedAt,
    gateEnabled: input.gateEnabled,
    lastAgentLine: null,
    nowMs: input.atMs,
    seq: 1,
    timeline: [],
    proposalSeq: new Map(),
    confirmations: new Map(),
    outcomes: new Map(),
    committedSeq: null,
    committedAtMs: null,
    actualModel: null,
    commitRefusals: [],
  }
  recordEvent(created, "session_started")
  return created
}

export function pushTimeline(state: IntakeState, entry: TimelineEntry): void {
  state.timeline.push(entry)
  if (state.timeline.length > MAX_TIMELINE_ENTRIES) {
    state.timeline = state.timeline.slice(-MAX_TIMELINE_ENTRIES)
  }
}

export function recordTurn(state: IntakeState, turn: TurnRecord): void {
  const unscored = turn.words.find(
    (w) => !Number.isFinite(w.confidence) || w.confidence < 0 || w.confidence > 1,
  )
  if (unscored !== undefined) {
    throw new InvalidWordSpanError(
      `word "${unscored.text}" in turn ${turn.turnOrder} carries no usable confidence (${String(unscored.confidence)}); an unscored turn is not a turn without problems and is refused rather than stored`,
    )
  }

  const echo = matchesServerRecordedAgentLine({
    transcript: turn.transcript,
    agentLine: state.lastAgentLine,
  })
  if (echo.matchesAgent) {
    recordEvent(state, "echo_turn_discarded", {
      detail: { turnOrder: turn.turnOrder, overlap: echo.overlap },
    })
    throw new EchoTurnError(
      `turn ${turn.turnOrder} ("${turn.transcript}") matches a line this server generated ("${String(echo.matchedAgainst)}", overlap ${echo.overlap.toFixed(2)}); a turn that echoes the agent's own speech cannot become a source of provenance regardless of what the browser labelled it, so it is refused rather than stored`,
    )
  }

  const kept = [...state.turns.filter((t) => t.turnOrder !== turn.turnOrder), turn]
  state.turns = kept.slice(-MAX_TURNS_PER_SESSION)
  recordEvent(state, "turn_received", { detail: { turnOrder: turn.turnOrder } })
}

export function rememberCandidate(state: IntakeState, candidate: FieldCandidate): void {
  if (state.order.fields.has(candidate.field)) {
    state.order = withdrawField(state.order, candidate.field)
  }
  state.candidates.set(candidate.candidateId, candidate)
  while (state.candidates.size > MAX_CANDIDATES_PER_SESSION) {
    const oldest = state.candidates.keys().next()
    if (oldest.done === true) {
      break
    }
    state.candidates.delete(oldest.value)
  }
  recordEvent(state, "field_proposed", {
    field: candidate.field,
    detail: { candidateId: candidate.candidateId, attempt: candidate.attempt },
  })
}

export function rememberDecision(state: IntakeState, decision: GateDecision): void {
  state.decisions.push(decision)
  if (state.decisions.length > MAX_DECISIONS_PER_SESSION) {
    state.decisions = state.decisions.slice(-MAX_DECISIONS_PER_SESSION)
  }
  state.lastAgentLine = decision.agentUtterance
  recordEvent(state, "gate_decided", {
    field: decision.field,
    reasonCode: decision.reasonCode,
    detail: { action: decision.action, candidateId: decision.candidateId },
  })
}

export function rememberAgentLine(state: IntakeState, utterance: string): void {
  state.lastAgentLine = utterance
}

export function writeConfirmed(state: IntakeState, value: ConfirmedValue): void {
  state.order = setField(state.order, value)
}

export function markEscalated(state: IntakeState, field: FieldName): void {
  state.escalated.add(field)
  state.order = withStatus(state.order, "needs_pharmacist")
  recordEvent(state, "escalated", { field })
}

export function markAborted(state: IntakeState, field: FieldName): void {
  state.order = abortField(state.order, field)
  recordEvent(state, "order_refused", { field, detail: { cause: "aborted" } })
}
