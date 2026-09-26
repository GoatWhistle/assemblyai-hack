import { readBackIsContrastive } from "@/confirmation"
import {
  type ConfirmationEvidence,
  ConfirmationMode,
  ConfirmationReason,
  type FieldCandidate,
  GateAction,
  type GateDecision,
  policyFor,
} from "@/domain"
import { confirm } from "@/gate"
import { evaluateConfirmation } from "@/sessions"
import {
  type IntakeState,
  type ReadBackRegistration,
  recordEvent,
  rememberAgentLine,
  writeConfirmed,
} from "./intake"
import type { IntakeEvent } from "./intake-events"
import { orderNext } from "./next-step"
import { applyNamedPartner, contrastiveFor, pairRuleFor, reaskLine } from "./pair-rule"
import type { ToolPayload } from "./respond"

type ReadBackEvent = Extract<IntakeEvent, { type: "read_back" }>

type ConfirmationEvent = Extract<IntakeEvent, { type: "confirmation" }>

function register(state: IntakeState, event: ReadBackEvent | ConfirmationEvent): void {
  const registration: ReadBackRegistration = {
    field: event.field,
    candidateId: event.candidateId,
    utterance: event.utterance,
    style: event.style,
    sinceMs: event.atMs,
    answered: event.type === "confirmation",
  }
  state.readBack = registration
  rememberAgentLine(state, event.utterance)
  recordEvent(state, "read_back_requested", {
    field: event.field,
    detail: { candidateId: event.candidateId, style: event.style },
  })
  if (event.style === "spell_out") {
    recordEvent(state, "spell_out_entered", {
      field: event.field,
      detail: { candidateId: event.candidateId },
    })
  }
}

export function applyReadBackRegistration(
  state: IntakeState,
  event: ReadBackEvent,
): ToolPayload {
  register(state, event)
  const pair = pairRuleFor(state.candidates.get(event.candidateId))
  if (pair !== null) {
    const contrastive = readBackIsContrastive(pair, event.utterance)
    return {
      registered: true,
      field: event.field,
      candidate_id: event.candidateId,
      awaiting: "named_drug",
      answer: "unclear",
      written_to_order: false,
      say_to_caller: contrastive ? event.utterance : contrastiveFor(pair),
      note: contrastive
        ? "say the sentence now. This value is in a published sound-alike pair, so only the caller saying one of the names confirms it; a yes does not"
        : "your sentence does not name every sound-alike partner, so it cannot confirm this value; say say_to_caller instead, which names each drug with the letters that tell them apart",
    }
  }
  if (latestDecision(state, event.candidateId)?.action === GateAction.Accept) {
    return {
      registered: true,
      field: event.field,
      candidate_id: event.candidateId,
      awaiting: "nothing",
      answer: "unclear",
      written_to_order: false,
      note: "this value passed its validator, so it needs no yes from the caller. Call read_back again right now with the same candidate_id and caller_answer set to the caller's most recent words; that second call writes it unless the caller has said no. Then say the sentence and go on",
    }
  }
  return {
    registered: true,
    field: event.field,
    candidate_id: event.candidateId,
    awaiting: "yes_no",
    answer: "unclear",
    written_to_order: false,
    note: "say the sentence now; once the caller has answered, call read_back again with caller_answer. The answer is judged from the recorded turns, not from caller_answer",
  }
}

function evidenceSummary(evidence: ConfirmationEvidence): ToolPayload {
  return {
    reason_code: evidence.reasonCode,
    read_back_reply_id: evidence.readBack?.replyId ?? null,
    read_back_text: evidence.readBack?.text ?? null,
    read_back_completed: evidence.readBack?.completed ?? null,
    caller_turn: evidence.callerTurn?.turnOrder ?? null,
    caller_text: evidence.callerTurn?.transcript ?? null,
    caller_answer_hint: evidence.callerAnswerHint,
  }
}

function latestDecision(state: IntakeState, candidateId: string): GateDecision | undefined {
  return [...state.decisions].reverse().find((d) => d.candidateId === candidateId)
}

export function evidenceFor(
  state: IntakeState,
  candidate: FieldCandidate,
  callerAnswerHint: string | null,
): ConfirmationEvidence {
  const since = state.proposalSeq.get(candidate.candidateId) ?? 0
  return evaluateConfirmation({
    subject: {
      field: candidate.field,
      candidateId: candidate.candidateId,
      rawValue: candidate.rawValue,
      normalizedValue: candidate.normalizedValue,
    },
    timeline: state.timeline.filter((entry) => entry.seq > since),
    callerAnswerHint,
    lasaChecked: policyFor(candidate.field).lasaChecked,
  })
}

function refused(event: ConfirmationEvent, field: string, error: string): ToolPayload {
  return {
    registered: true,
    field,
    candidate_id: event.candidateId,
    awaiting: "yes_no",
    answer: "unclear",
    written_to_order: false,
    error,
  }
}

export function applyConfirmation(state: IntakeState, event: ConfirmationEvent): ToolPayload {
  register(state, event)
  const candidate = state.candidates.get(event.candidateId)
  const decision = latestDecision(state, event.candidateId)

  if (candidate === undefined || decision === undefined) {
    recordEvent(state, "read_back_failed", {
      field: event.field,
      detail: { candidateId: event.candidateId, cause: "no_decision" },
    })
    return refused(
      event,
      event.field,
      "no gate decision exists for that candidate_id, so nothing can be confirmed",
    )
  }

  if (candidate.field !== event.field) {
    recordEvent(state, "read_back_failed", {
      field: candidate.field,
      detail: { candidateId: event.candidateId, cause: "field_mismatch" },
    })
    return refused(
      event,
      candidate.field,
      `candidate ${event.candidateId} was proved for ${candidate.field}, not for ${event.field}; a value is confirmed under the field it was proved for or not at all`,
    )
  }

  const evidence = evidenceFor(state, candidate, event.callerAnswerHint)
  if (evidence.reasonCode === ConfirmationReason.CallerNamedPartner) {
    return applyNamedPartner({ state, event, original: candidate, evidence })
  }
  state.confirmations.set(candidate.field, evidence)
  const accepted = decision.action === GateAction.Accept
  const writes = accepted ? evidence.verdict !== "rejected" : evidence.verdict === "confirmed"

  if (!writes) {
    recordEvent(state, "read_back_failed", {
      field: candidate.field,
      reasonCode: null,
      detail: {
        candidateId: event.candidateId,
        answer: evidence.verdict,
        cause: evidence.reasonCode,
      },
    })
    return {
      registered: true,
      field: candidate.field,
      candidate_id: event.candidateId,
      awaiting: "yes_no",
      answer: evidence.verdict,
      reason_code: evidence.reasonCode,
      written_to_order: false,
      say_to_caller: reaskLine(candidate, evidence),
      evidence: evidenceSummary(evidence),
    }
  }

  const mode =
    event.style === "spell_out" ? ConfirmationMode.SpellOut : ConfirmationMode.ReadBack
  const value = confirm({
    candidate,
    policy: policyFor(candidate.field),
    decision,
    confirmationMode: accepted ? ConfirmationMode.Validator : mode,
    callerConfirmed: evidence.verdict === "confirmed",
    confirmedAt: new Date(event.atMs).toISOString(),
  })

  writeConfirmed(state, value)
  recordEvent(state, "read_back_matched", {
    field: candidate.field,
    detail: { candidateId: event.candidateId },
  })

  return {
    registered: true,
    field: candidate.field,
    candidate_id: event.candidateId,
    awaiting: null,
    answer: evidence.verdict,
    reason_code: evidence.reasonCode,
    written_to_order: true,
    confirmation_mode: value.confirmationMode,
    read_back_utterance: event.utterance,
    evidence: evidenceSummary(evidence),
    after_this: orderNext(state),
  }
}
