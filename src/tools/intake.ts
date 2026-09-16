import {
  abortField,
  type ConfirmedValue,
  CRITICAL_FIELDS,
  emptyOrder,
  type FieldCandidate,
  type FieldName,
  type GateDecision,
  type MetricEvent,
  missingFields,
  type Order,
  setField,
  withStatus,
} from "@/domain"
import type { TurnRecord } from "@/sessions"

export type ReadBackRegistration = {
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
}

const states = new Map<string, IntakeState>()

export function intakeFor(sessionId: string, gateEnabled = true): IntakeState {
  const existing = states.get(sessionId)
  if (existing !== undefined) {
    return existing
  }
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
  }
  states.set(sessionId, created)
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
  state.turns = [...state.turns.filter((t) => t.turnOrder !== turn.turnOrder), turn]
}

export function writeConfirmed(state: IntakeState, value: ConfirmedValue): void {
  state.order = setField(state.order, value)
}

export function markEscalated(state: IntakeState, field: FieldName): void {
  state.escalated.add(field)
  state.order = withStatus(state.order, "needs_pharmacist")
}

export function markAborted(state: IntakeState, field: FieldName): void {
  state.order = abortField(state.order, field)
}

export function missingCritical(state: IntakeState): readonly FieldName[] {
  return missingFields(state.order, CRITICAL_FIELDS)
}

export function hasEscalation(state: IntakeState): boolean {
  return state.escalated.size > 0
}
