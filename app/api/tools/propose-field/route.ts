import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import {
  FIELD_NAMES,
  type FieldName,
  GateAction,
  type GateDecision,
  makeCandidate,
  policyFor,
  ReasonCode,
} from "@/domain"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import {
  matchProvenance,
  normalizeFieldValue,
  type ProvenanceMatch,
  reconcileValue,
  searchedTurns,
  searchedTurnText,
  type TurnRecord,
  unsupportedValueVerdict,
  validateField,
} from "@/sessions"
import {
  intakeFor,
  markAborted,
  markEscalated,
  rememberCandidate,
  rememberDecision,
  runTool,
  type ToolPayload,
  toolCatalog,
} from "@/tools"
import { sessionIdField, spokenValueField, utteranceField } from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

const schema = z.object({
  session_id: sessionIdField(),
  field: z.enum(FIELD_NAMES as [FieldName, ...FieldName[]]),
  value: spokenValueField(),
  transcript_hint: utteranceField(),
})

function untraceable(input: {
  field: FieldName
  quotation: string
  turns: readonly TurnRecord[]
}): ToolPayload {
  return {
    action: GateAction.AskConfirm,
    reason_code: "E_PROVENANCE_NOT_FOUND",
    field: input.field,
    candidate_id: null,
    say_to_caller: `I cannot find "${input.quotation}" in what you said. Could you repeat the last part?`,
    written_to_order: false,
    evidence: {
      quotation: input.quotation,
      quoted_span: null,
      searched_turns: [...searchedTurns(input.turns)],
      searched_turn_text: searchedTurnText(input.turns),
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
      note:
        decision.reasonCode === ReasonCode.LasaHit
          ? "asked regardless of confidence by design"
          : null,
    },
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { status, payload } = await runTool(request, schema, (input) => {
    const state = intakeFor(input.session_id)
    const field = input.field
    const policy = policyFor(field)

    const matched = matchProvenance({
      hint: input.transcript_hint,
      turns: state.turns,
      sessionId: input.session_id,
    })

    if (matched === null) {
      return untraceable({ field, quotation: input.transcript_hint, turns: state.turns })
    }

    const attempt = [...state.candidates.values()].filter((c) => c.field === field).length + 1

    const sourceTurn = state.turns.find((t) => t.turnOrder === matched.turnOrder)
    const reconciliation =
      sourceTurn === undefined ? null : reconcileValue({ value: input.value, turn: sourceTurn })

    const normalizedValue = normalizeFieldValue(field, input.value)
    const fieldVerdict = validateField({
      field,
      normalizedValue,
      catalog: toolCatalog(),
      context: {
        drugName: state.order.fields.get("drug_name" as FieldName)?.value as string | undefined,
        strength: state.order.fields.get("strength" as FieldName)?.value as string | undefined,
        dosageForm: state.order.fields.get("dosage_form" as FieldName)?.value as
          | string
          | undefined,
        route: state.order.fields.get("route" as FieldName)?.value as string | undefined,
      },
    })

    const verdict =
      reconciliation === null || reconciliation.supported
        ? fieldVerdict
        : unsupportedValueVerdict({ field, value: input.value, reconciliation })

    const candidate = makeCandidate({
      candidateId: randomUUID(),
      field,
      rawValue: input.value,
      normalizedValue,
      provenance: matched.provenance,
      verdict,
      lasa: policy.lasaChecked ? lasaRiskFor(input.value) : undefined,
      attempt,
    })

    rememberCandidate(state, candidate)

    const decision = decide(candidate, policy)
    rememberDecision(state, decision)

    if (decision.action === GateAction.EscalateHuman) {
      markEscalated(state, field)
    }
    if (decision.action === GateAction.AbortField) {
      markAborted(state, field)
    }

    return decided({ decision, quotation: input.transcript_hint, matched })
  })

  return NextResponse.json(payload, { status })
}
