import { searchedTurns, searchedTurnText } from "@/confirmation"
import {
  CRITICAL_FIELDS,
  type FieldName,
  GateAction,
  type GateDecision,
  QUOTATION_NOT_YET_RECEIVED_CODE,
} from "@/domain"
import type { IntakeState } from "./intake"
import type { ToolPayload } from "./respond"

export const READ_BACK_NEXT =
  "Call read_back now with this field, candidate_id and utterance set to say_to_caller, then say say_to_caller. After the caller answers, call read_back again with caller_answer. Nothing is written before that second call."

export const ACCEPT_NEXT =
  "Written: its validator proved it, so no yes is needed and no read_back call either. Say say_to_caller, then follow after_this."

type Pending = {
  readonly field: FieldName
  readonly candidate_id: string
  readonly say_to_caller: string
  readonly accepted: boolean
}

function readBackable(decision: GateDecision): boolean {
  return (
    decision.action === GateAction.Accept ||
    decision.action === GateAction.AskDisambiguate ||
    decision.confirmationMode !== null
  )
}

export function proposalNext(decision: GateDecision): string | null {
  if (decision.action === GateAction.Accept) {
    return ACCEPT_NEXT
  }
  return readBackable(decision) ? READ_BACK_NEXT : null
}

function pendingReadBacks(state: IntakeState): readonly Pending[] {
  const latest = new Map<FieldName, GateDecision>()
  for (const decision of state.decisions) {
    latest.set(decision.field, decision)
  }
  const pending: Pending[] = []
  for (const [field, decision] of latest) {
    if (
      state.order.fields.has(field) ||
      state.order.abortedFields.includes(field) ||
      state.escalated.has(field) ||
      !readBackable(decision)
    ) {
      continue
    }
    pending.push({
      field,
      candidate_id: decision.candidateId,
      say_to_caller: decision.agentUtterance,
      accepted: decision.action === GateAction.Accept,
    })
  }
  return pending.sort((a, b) => Number(b.accepted) - Number(a.accepted))
}

export function orderNext(state: IntakeState): ToolPayload {
  const pending = pendingReadBacks(state)
  const waiting = new Set(pending.map((p) => p.field))
  const missing = CRITICAL_FIELDS.filter(
    (field) =>
      !state.order.fields.has(field) &&
      !waiting.has(field) &&
      !state.order.abortedFields.includes(field),
  )
  const first = pending[0]
  const next =
    first !== undefined
      ? first.accepted
        ? `Write ${first.field} next: it was accepted, so call read_back with its candidate_id and utterance set to its say_to_caller, then at once again with caller_answer set to the caller's most recent words.`
        : `Read back ${first.field} next: call read_back with its candidate_id and utterance set to its say_to_caller, then say it.`
      : missing.length > 0
        ? `Ask the caller for ${missing[0]?.replace(/_/g, " ")}.`
        : "Every required field is written. Read the whole order back and ask whether all of it is correct. When the caller says yes, call commit_order at once with caller_confirmed true."
  return {
    still_to_read_back: pending,
    still_missing: missing,
    next,
  }
}

export const MAX_QUOTATION_RETRIES = 2

function awaitingCallerReply(state: IntakeState): boolean {
  const spoke = state.timeline.findLast((entry) => entry.kind === "agent")?.seq
  return (
    spoke !== undefined &&
    !state.timeline.some((entry) => entry.kind === "caller" && entry.seq > spoke)
  )
}

function retriesSinceCallerSpoke(state: IntakeState, field: FieldName): number {
  const heard = state.timeline.findLast((entry) => entry.kind === "caller")?.seq ?? 0
  return [...state.outcomes].filter(
    ([seq, outcome]) =>
      seq > heard &&
      outcome.payload.reason_code === QUOTATION_NOT_YET_RECEIVED_CODE &&
      outcome.payload.field === field,
  ).length
}

export function quotationNotFound(
  state: IntakeState,
  input: { field: FieldName; value: string; quotation: string },
): ToolPayload {
  const evidence = {
    quotation: input.quotation,
    quoted_span: null,
    searched_turns: [...searchedTurns(state.turns)],
    searched_turn_text: searchedTurnText(state.turns),
  }
  const pending =
    awaitingCallerReply(state) &&
    retriesSinceCallerSpoke(state, input.field) < MAX_QUOTATION_RETRIES
  if (!pending) {
    return {
      action: GateAction.AskConfirm,
      reason_code: "E_PROVENANCE_NOT_FOUND",
      field: input.field,
      candidate_id: null,
      say_to_caller: `I cannot find "${input.quotation}" in what you said. Could you repeat the last part?`,
      written_to_order: false,
      evidence,
    }
  }
  return {
    reason_code: QUOTATION_NOT_YET_RECEIVED_CODE,
    field: input.field,
    candidate_id: null,
    say_to_caller: null,
    written_to_order: false,
    retry_with: { field: input.field, value: input.value, transcript_hint: input.quotation },
    next: "The caller's words have not reached the pharmacy server yet, because no caller turn has arrived since you last spoke. Call propose_field again with exactly the arguments in retry_with. Do not ask the caller to repeat, and do not tell the caller anything failed.",
    evidence: {
      ...evidence,
      note: "nothing was proposed to the gate; the quotation is not refused, it is not yet searchable",
    },
  }
}
