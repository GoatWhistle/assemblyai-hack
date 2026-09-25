import {
  judgeNamedAnswer,
  normalizeFieldValue,
  type PairSubject,
  pairRuleApplies,
  partnersOf,
  spokenIn,
} from "@/confirmation"
import {
  type ConfirmationEvidence,
  ConfirmationMode,
  ConfirmationReason,
  type FieldCandidate,
  type FieldName,
  GateAction,
  makeCandidate,
  makeProvenance,
  policyFor,
  ReasonCode,
  type WordSpan,
} from "@/domain"
import {
  confirm,
  contrastiveUtterance,
  decide,
  namedAnswerRequiredUtterance,
  readBackUtterance,
  spokenField,
} from "@/gate"
import { lasaRiskFor } from "@/lasa"
import { validateField } from "@/sessions"
import { toolCatalog } from "./catalog-access"
import {
  type IntakeState,
  recordEvent,
  rememberCandidate,
  rememberDecision,
  writeConfirmed,
} from "./intake"
import type { IntakeEvent } from "./intake-events"
import type { ToolPayload } from "./respond"

type ConfirmationEvent = Extract<IntakeEvent, { type: "confirmation" }>

export function pairRuleFor(candidate: FieldCandidate | undefined): PairSubject | null {
  if (candidate === undefined) {
    return null
  }
  return pairRuleApplies(candidate, policyFor(candidate.field).lasaChecked) ? candidate : null
}

export function contrastiveFor(subject: PairSubject): string {
  return contrastiveUtterance(
    String(subject.normalizedValue ?? subject.rawValue),
    partnersOf(subject),
  )
}

const REASK_REASONS: readonly string[] = [
  ConfirmationReason.CallerNegated,
  ConfirmationReason.CallerCorrected,
  ConfirmationReason.CallerRepeatMismatch,
  ConfirmationReason.Superseded,
]

export function reaskLine(candidate: FieldCandidate, evidence: ConfirmationEvidence): string {
  if (REASK_REASONS.includes(evidence.reasonCode)) {
    return `Let me take ${spokenField(candidate.field)} again. What should it be?`
  }
  const pair = pairRuleFor(candidate)
  if (pair !== null) {
    const heard = String(pair.normalizedValue ?? pair.rawValue)
    return evidence.reasonCode === ConfirmationReason.LasaNamedAnswerRequired
      ? namedAnswerRequiredUtterance(heard, partnersOf(pair))
      : contrastiveFor(pair)
  }
  return readBackUtterance(candidate.field, candidate.normalizedValue)
}

const CORRECTED_SUFFIX = "-named-partner"

function contextValue(state: IntakeState, field: FieldName): string | undefined {
  const value = state.order.fields.get(field)?.value
  return typeof value === "string" ? value : undefined
}

function partnerWords(words: readonly WordSpan[], partner: string): readonly WordSpan[] {
  const found = words.find((word) => spokenIn(partner, word.text))
  return found === undefined ? [] : [found]
}

function correctedCandidate(input: {
  state: IntakeState
  original: FieldCandidate
  partner: string
  words: readonly WordSpan[]
  turnOrder: number
  atMs: number
}): FieldCandidate {
  const { state, original, partner, words } = input
  const field = original.field
  const normalizedValue = normalizeFieldValue(field, partner)
  const verdict = validateField({
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
  const attempt = [...state.candidates.values()].filter((c) => c.field === field).length + 1
  const spoken = words.map((word) => word.text).join(" ")
  return makeCandidate({
    candidateId: `${original.candidateId}${CORRECTED_SUFFIX}`,
    field,
    rawValue: spoken,
    normalizedValue,
    provenance: makeProvenance({
      words,
      turnOrder: input.turnOrder,
      transcriptSlice: spoken,
      sessionId: state.sessionId,
    }),
    verdict,
    lasa: lasaRiskFor(partner),
    attempt,
    createdAt: new Date(input.atMs).toISOString(),
  })
}

export function applyNamedPartner(input: {
  state: IntakeState
  event: ConfirmationEvent
  original: FieldCandidate
  evidence: ConfirmationEvidence
}): ToolPayload {
  const { state, event, original, evidence } = input
  const callerTurn = evidence.callerTurn
  const answer =
    callerTurn === null
      ? null
      : judgeNamedAnswer({ subject: original, text: callerTurn.transcript })
  const partner = answer?.correctedTo ?? null
  const words =
    callerTurn === null || partner === null ? [] : partnerWords(callerTurn.words, partner)
  if (callerTurn === null || partner === null || words.length === 0) {
    return {
      registered: true,
      field: original.field,
      candidate_id: event.candidateId,
      awaiting: "named_drug",
      answer: "unclear",
      reason_code: ConfirmationReason.LasaNamedAnswerRequired,
      written_to_order: false,
      say_to_caller: "I did not catch which name you said. Please say the drug name once more.",
    }
  }

  const corrected = correctedCandidate({
    state,
    original,
    partner,
    words,
    turnOrder: callerTurn.turnOrder,
    atMs: event.atMs,
  })
  const spokenLine = state.lastAgentLine
  rememberCandidate(state, corrected)
  state.proposalSeq.set(corrected.candidateId, state.proposalSeq.get(original.candidateId) ?? 0)
  const policy = policyFor(corrected.field)
  const decision = decide(corrected, policy)
  rememberDecision(state, decision)
  state.lastAgentLine = spokenLine

  const named =
    decision.action === GateAction.AskDisambiguate && decision.reasonCode === ReasonCode.LasaHit
  if (!named) {
    state.confirmations.set(original.field, evidence)
    recordEvent(state, "read_back_failed", {
      field: original.field,
      detail: {
        candidateId: event.candidateId,
        cause: evidence.reasonCode,
        correctedTo: partner,
      },
    })
    return {
      registered: true,
      field: original.field,
      candidate_id: corrected.candidateId,
      awaiting: "yes_no",
      answer: "rejected",
      reason_code: evidence.reasonCode,
      corrected_to: partner,
      written_to_order: false,
      say_to_caller: decision.agentUtterance,
      gate_reason_code: decision.reasonCode,
    }
  }

  const value = confirm({
    candidate: corrected,
    policy,
    decision,
    confirmationMode: ConfirmationMode.ReadBack,
    callerConfirmed: true,
    confirmedAt: new Date(event.atMs).toISOString(),
  })
  writeConfirmed(state, value)
  state.confirmations.set(corrected.field, {
    ...evidence,
    candidateId: corrected.candidateId,
    verdict: "confirmed",
    reasonCode: ConfirmationReason.CallerNamedValue,
  })
  recordEvent(state, "read_back_matched", {
    field: corrected.field,
    detail: { candidateId: corrected.candidateId, correctedFrom: event.candidateId },
  })
  return {
    registered: true,
    field: corrected.field,
    candidate_id: corrected.candidateId,
    awaiting: null,
    answer: "corrected",
    reason_code: evidence.reasonCode,
    corrected_to: partner,
    corrected_from: String(original.normalizedValue ?? original.rawValue),
    written_to_order: true,
    confirmation_mode: value.confirmationMode,
    say_to_caller: `Thank you. ${partner}, not ${String(original.normalizedValue ?? original.rawValue)}.`,
  }
}
