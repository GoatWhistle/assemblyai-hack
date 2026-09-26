import { CRITICAL_FIELDS, type FieldName, GateAction, type GateDecision } from "@/domain"
import type { IntakeState } from "./intake"
import type { ToolPayload } from "./respond"

export const READ_BACK_NEXT =
  "Call read_back now with this field, candidate_id and utterance set to say_to_caller, then say say_to_caller. After the caller answers, call read_back again with caller_answer. Nothing is written before that second call."

type Pending = {
  readonly field: FieldName
  readonly candidate_id: string
  readonly say_to_caller: string
}

function readBackable(decision: GateDecision): boolean {
  return (
    decision.action === GateAction.Accept ||
    decision.action === GateAction.AskDisambiguate ||
    decision.confirmationMode !== null
  )
}

export function proposalNext(decision: GateDecision): string | null {
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
    })
  }
  return pending
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
      ? `Read back ${first.field} next: call read_back with its candidate_id and utterance set to its say_to_caller, then say it.`
      : missing.length > 0
        ? `Ask the caller for ${missing[0]?.replace(/_/g, " ")}.`
        : "Every required field is written. Read the whole order back and ask whether all of it is correct."
  return {
    still_to_read_back: pending,
    still_missing: missing,
    next,
  }
}
