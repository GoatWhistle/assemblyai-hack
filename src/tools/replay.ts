import type { TurnRecord } from "@/confirmation"
import { ConfirmationReason, makeWordSpan, ReadbackError, withdrawField } from "@/domain"
import { supersededBy } from "@/sessions"
import { applyCommit } from "./apply-commit"
import { applyProposal } from "./apply-proposal"
import { applyConfirmation, applyReadBackRegistration } from "./apply-read-back"
import {
  createIntakeState,
  type IntakeOutcome,
  type IntakeState,
  pushTimeline,
  recordEvent,
  recordTurn,
  rememberAgentLine,
} from "./intake"
import type { IntakeEvent } from "./intake-events"
import type { ToolPayload } from "./respond"

type CallerTurnEvent = Extract<IntakeEvent, { type: "caller_turn" }>

type AgentTurnEvent = Extract<IntakeEvent, { type: "agent_turn" }>

function ok(payload: ToolPayload): IntakeOutcome {
  return { status: 200, payload }
}

function voidSuperseded(state: IntakeState, turn: TurnRecord): void {
  for (const [field, value] of state.order.fields) {
    const candidate = state.candidates.get(value.candidateId)
    const subject = {
      field,
      candidateId: value.candidateId,
      rawValue: candidate?.rawValue ?? String(value.value),
      normalizedValue: value.value,
    }
    if (!supersededBy({ subject, turn })) {
      continue
    }
    state.order = withdrawField(state.order, field)
    const prior = state.confirmations.get(field)
    state.confirmations.set(field, {
      field,
      candidateId: value.candidateId,
      readBack: prior?.readBack ?? null,
      callerTurn: prior?.callerTurn ?? null,
      callerAnswerHint: prior?.callerAnswerHint ?? null,
      verdict: "rejected",
      reasonCode: ConfirmationReason.Superseded,
    })
    recordEvent(state, "read_back_failed", {
      field,
      detail: {
        candidateId: value.candidateId,
        cause: ConfirmationReason.Superseded,
        turnOrder: turn.turnOrder,
      },
    })
  }
}

function applyCallerTurn(
  state: IntakeState,
  event: CallerTurnEvent,
  seq: number,
): IntakeOutcome {
  const turn: TurnRecord = {
    turnOrder: event.turn.turnOrder,
    transcript: event.turn.transcript,
    isFormatted: event.turn.isFormatted,
    words: event.turn.words.map((word) => makeWordSpan(word)),
  }
  recordTurn(state, turn)
  pushTimeline(state, { seq, kind: "caller", turn })
  voidSuperseded(state, turn)
  return ok({ accepted: true, role: "caller", turnOrder: turn.turnOrder })
}

function applyAgentTurn(state: IntakeState, event: AgentTurnEvent, seq: number): IntakeOutcome {
  pushTimeline(state, { seq, kind: "agent", turn: event.turn })
  rememberAgentLine(state, event.turn.text)
  return ok({ accepted: true, role: "agent", replyId: event.turn.replyId })
}

function applyEvent(state: IntakeState, event: IntakeEvent, seq: number): IntakeOutcome {
  try {
    switch (event.type) {
      case "registered":
        return { status: 409, payload: { error: "a session is registered once" } }
      case "caller_turn":
        return applyCallerTurn(state, event, seq)
      case "agent_turn":
        return applyAgentTurn(state, event, seq)
      case "recognizer":
        state.actualModel = event.model
        return ok({ accepted: true, role: "recognizer", model: event.model })
      case "proposal":
        return ok(applyProposal(state, event, seq))
      case "read_back":
        return ok(applyReadBackRegistration(state, event))
      case "confirmation":
        return ok(applyConfirmation(state, event))
      case "commit":
        return ok(applyCommit(state, event, seq))
    }
  } catch (error) {
    if (error instanceof ReadbackError) {
      return { status: 422, payload: { error: error.message, code: error.code } }
    }
    return { status: 500, payload: { error: "the tool failed unexpectedly" } }
  }
}

export function replayIntake(
  sessionId: string,
  events: readonly (IntakeEvent | null)[],
): IntakeState | null {
  const first = events[0]
  if (first === undefined || first === null || first.type !== "registered") {
    return null
  }
  const state = createIntakeState({
    sessionId,
    agentId: first.agentId,
    gateEnabled: first.gateEnabled,
    atMs: first.atMs,
  })
  for (let index = 1; index < events.length; index += 1) {
    const seq = index + 1
    const event = events[index]
    state.seq = seq
    if (event === undefined || event === null) {
      state.outcomes.set(seq, {
        status: 500,
        payload: { error: "the stored event was unreadable" },
      })
      continue
    }
    state.nowMs = event.atMs
    state.outcomes.set(seq, applyEvent(state, event, seq))
  }
  return state
}
