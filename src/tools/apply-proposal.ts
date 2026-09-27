import { findDrug } from "@/catalog"
import {
  matchProvenance,
  normalizeFieldValue,
  type ProvenanceMatch,
  sameKindFor,
  spokenSupportVerdict,
  type TurnRecord,
} from "@/confirmation"
import {
  FieldName,
  GateAction,
  type GateDecision,
  makeCandidate,
  policyFor,
  ReasonCode,
  STALE_PROPOSAL_CODE,
} from "@/domain"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import {
  isPlaceholderPatientName,
  PLACEHOLDER_VALUE_CODE,
  supersededBy,
  validateField,
} from "@/sessions"
import { toolCatalog } from "./catalog-access"
import {
  type IntakeState,
  markAborted,
  markEscalated,
  recordEvent,
  rememberCandidate,
  rememberDecision,
  writeAccepted,
} from "./intake"
import type { IntakeEvent } from "./intake-events"
import { orderNext, proposalNext, quotationNotFound } from "./next-step"
import type { ToolPayload } from "./respond"

type ProposalEvent = Extract<IntakeEvent, { type: "proposal" }>

function stale(input: { field: FieldName; source: number; newer: TurnRecord }): ToolPayload {
  return {
    action: GateAction.AskConfirm,
    reason_code: STALE_PROPOSAL_CODE,
    field: input.field,
    candidate_id: null,
    say_to_caller: "reassess the latest statement",
    written_to_order: false,
    evidence: {
      source_turn: input.source,
      newer_turn: input.newer.turnOrder,
      newer_turn_text: input.newer.transcript,
      note: "the caller said something newer about this field after the turn this value was quoted from; propose again from the latest statement",
    },
  }
}

function decided(input: {
  decision: GateDecision
  quotation: string
  matched: ProvenanceMatch
}): ToolPayload {
  const { decision, matched } = input
  return {
    action: decision.action,
    reason_code: decision.reasonCode,
    field: decision.field,
    candidate_id: decision.candidateId,
    say_to_caller: decision.agentUtterance,
    written_to_order: false,
    confirmation_mode: decision.confirmationMode,
    next: proposalNext(decision),
    evidence: {
      min_confidence: decision.evidence.minConfidence,
      threshold: decision.evidence.threshold,
      outcome: decision.evidence.outcome,
      rule_cited: decision.evidence.ruleCited,
      attempt: decision.evidence.attempt,
      span_ms: decision.evidence.spanMs,
      lasa_source: decision.evidence.lasaSource ?? null,
      quotation: input.quotation,
      quoted_span: matched.quotedSpan,
      source_turn: matched.turnOrder,
      spoken_text: decision.evidence.spokenText ?? null,
      unsupported_tokens: decision.evidence.unsupportedTokens ?? null,
      support_code: decision.evidence.supportCode ?? null,
      note:
        decision.reasonCode === ReasonCode.LasaHit
          ? "asked regardless of confidence by design"
          : null,
    },
  }
}

function catalogueDrugName(token: string): boolean {
  return findDrug(toolCatalog(), token)?.matchKind === "exact" || lasaRiskFor(token).hit
}

function contextValue(state: IntakeState, field: FieldName): string | undefined {
  const value = state.order.fields.get(field)?.value
  return typeof value === "string" ? value : undefined
}

export function applyProposal(
  state: IntakeState,
  event: ProposalEvent,
  seq: number,
): ToolPayload {
  const { field, value } = event
  const policy = policyFor(field)

  if (field === FieldName.PatientName && isPlaceholderPatientName(value)) {
    recordEvent(state, "read_back_failed", {
      field,
      detail: { cause: PLACEHOLDER_VALUE_CODE },
    })
    return {
      action: GateAction.AskConfirm,
      reason_code: PLACEHOLDER_VALUE_CODE,
      field,
      candidate_id: null,
      say_to_caller: "I need the patient's actual name. Could you say it for me?",
      written_to_order: false,
      evidence: {
        value,
        note: "a placeholder is not a name; nothing was proposed to the gate and nothing can be confirmed from it",
      },
    }
  }

  const matched = matchProvenance({
    hint: event.transcriptHint,
    turns: state.turns,
    sessionId: state.sessionId,
  })
  if (matched === null) {
    return quotationNotFound(state, { field, value, quotation: event.transcriptHint })
  }

  const newer = state.turns.find(
    (turn) =>
      turn.turnOrder > matched.turnOrder &&
      supersededBy({
        subject: {
          field,
          candidateId: event.candidateId,
          rawValue: value,
          normalizedValue: null,
        },
        turn,
      }),
  )
  if (newer !== undefined) {
    recordEvent(state, "read_back_failed", {
      field,
      detail: {
        cause: "stale_proposal",
        sourceTurn: matched.turnOrder,
        newerTurn: newer.turnOrder,
      },
    })
    return stale({ field, source: matched.turnOrder, newer })
  }

  const attempt = [...state.candidates.values()].filter((c) => c.field === field).length + 1
  const sourceTurn = state.turns.find((t) => t.turnOrder === matched.turnOrder)

  const normalizedValue = normalizeFieldValue(field, value)
  const fieldVerdict = validateField({
    field,
    normalizedValue,
    catalog: toolCatalog(),
    context: {
      drugName: contextValue(state, "drug_name"),
      strength: contextValue(state, "strength"),
      dosageForm: contextValue(state, "dosage_form"),
      route: contextValue(state, "route"),
    },
  })

  const verdict = spokenSupportVerdict({
    field,
    value,
    turn: sourceTurn,
    fieldVerdict,
    sameKind: sameKindFor(field, catalogueDrugName),
  })

  const candidate = makeCandidate({
    candidateId: event.candidateId,
    field,
    rawValue: value,
    normalizedValue,
    provenance: matched.provenance,
    verdict,
    lasa: policy.lasaChecked ? lasaRiskFor(value) : undefined,
    attempt,
    createdAt: new Date(event.atMs).toISOString(),
  })

  rememberCandidate(state, candidate)
  state.proposalSeq.set(candidate.candidateId, seq)

  const decision = decide(candidate, policy)
  rememberDecision(state, decision)

  if (decision.action === GateAction.EscalateHuman) {
    markEscalated(state, field)
  }
  if (decision.action === GateAction.AbortField) {
    markAborted(state, field)
  }

  const payload = decided({ decision, quotation: event.transcriptHint, matched })
  if (decision.action !== GateAction.Accept) {
    return payload
  }
  writeAccepted(state, candidate, decision)
  return { ...payload, written_to_order: true, after_this: orderNext(state) }
}
