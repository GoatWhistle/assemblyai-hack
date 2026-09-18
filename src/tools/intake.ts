import {
  abortField,
  type ConfirmedValue,
  CRITICAL_FIELDS,
  EchoTurnError,
  emptyOrder,
  type FieldCandidate,
  type FieldName,
  type GateDecision,
  InvalidWordSpanError,
  type MetricEvent,
  type MetricKind,
  missingFields,
  type Order,
  type ReasonCode,
  setField,
  withdrawField,
  withStatus,
} from "@/domain"
import { matchesServerRecordedAgentLine, type TurnRecord } from "@/sessions"

type ReadBackRegistration = {
  readonly field: FieldName
  readonly candidateId: string
  readonly utterance: string
  readonly style: "plain" | "spell_out"
}

export type IntakeState = {
  sessionId: string
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
}

export const MAX_LIVE_SESSIONS = 64

export const MAX_TURNS_PER_SESSION = 400

export const MAX_CANDIDATES_PER_SESSION = 200

export const MAX_DECISIONS_PER_SESSION = 400

const MAX_EVENTS_PER_SESSION = 800

const states = new Map<string, IntakeState>()

export function recordEvent(
  state: IntakeState,
  kind: MetricKind,
  input: {
    field?: FieldName | null
    reasonCode?: ReasonCode | null
    detail?: Readonly<Record<string, string | number | boolean | null>>
  } = {},
): void {
  const event: MetricEvent = {
    kind,
    sessionId: state.sessionId,
    atMs: Date.now(),
    field: input.field ?? null,
    reasonCode: input.reasonCode ?? null,
    detail: input.detail ?? {},
  }
  state.events.push(event)
  if (state.events.length > MAX_EVENTS_PER_SESSION) {
    state.events = state.events.slice(-MAX_EVENTS_PER_SESSION)
  }
}

function evictOldest(): void {
  while (states.size >= MAX_LIVE_SESSIONS) {
    const oldest = states.keys().next()
    if (oldest.done === true) {
      return
    }
    states.delete(oldest.value)
  }
}

export function liveSessionCount(): number {
  return states.size
}

export function intakeFor(sessionId: string, gateEnabled = true): IntakeState {
  const existing = states.get(sessionId)
  if (existing !== undefined) {
    states.delete(sessionId)
    states.set(sessionId, existing)
    return existing
  }
  evictOldest()
  const created: IntakeState = {
    sessionId,
    order: emptyOrder({ orderId: `order-${sessionId}`, sessionId }),
    turns: [],
    candidates: new Map(),
    decisions: [],
    events: [],
    readBack: null,
    escalated: new Set(),
    startedAt: new Date().toISOString(),
    gateEnabled,
    lastAgentLine: null,
  }
  states.set(sessionId, created)
  recordEvent(created, "session_started")
  return created
}

export function resetIntake(sessionId?: string): void {
  if (sessionId === undefined) {
    states.clear()
    return
  }
  states.delete(sessionId)
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

export function missingCritical(state: IntakeState): readonly FieldName[] {
  return missingFields(state.order, CRITICAL_FIELDS)
}

export type FieldOutcome = "never_asked" | "refused_by_gate" | "abandoned"

export function outcomeFor(state: IntakeState, field: FieldName): FieldOutcome {
  if (state.order.abortedFields.includes(field)) {
    return "abandoned"
  }
  const attempts = [...state.candidates.values()].filter((c) => c.field === field)
  return attempts.length === 0 ? "never_asked" : "refused_by_gate"
}

export function missingByOutcome(
  state: IntakeState,
): Readonly<Record<FieldOutcome, readonly FieldName[]>> {
  const grouped: Record<FieldOutcome, FieldName[]> = {
    never_asked: [],
    refused_by_gate: [],
    abandoned: [],
  }
  for (const field of missingCritical(state)) {
    grouped[outcomeFor(state, field)].push(field)
  }
  return Object.freeze({
    never_asked: Object.freeze(grouped.never_asked),
    refused_by_gate: Object.freeze(grouped.refused_by_gate),
    abandoned: Object.freeze(grouped.abandoned),
  })
}

export function hasEscalation(state: IntakeState): boolean {
  return state.escalated.size > 0
}
