import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import {
  FIELD_NAMES,
  type FieldName,
  GateAction,
  makeCandidate,
  policyFor,
  ReasonCode,
} from "@/domain"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import { matchProvenance, normalizeFieldValue, searchedTurns, validateField } from "@/sessions"
import { intakeFor, markAborted, markEscalated, runTool, toolCatalog } from "@/tools"
import { identifierField, spokenValueField, utteranceField } from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

const schema = z.object({
  session_id: identifierField(),
  field: z.enum(FIELD_NAMES as [FieldName, ...FieldName[]]),
  value: spokenValueField(),
  transcript_hint: utteranceField(),
})

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
      return {
        action: GateAction.AskConfirm,
        reason_code: "E_PROVENANCE_NOT_FOUND",
        field,
        candidate_id: null,
        say_to_caller:
          "I am not able to trace that back to what you said. Could you repeat the last part?",
        written_to_order: false,
        evidence: {
          hint: input.transcript_hint,
          searched_turns: [...searchedTurns(state.turns)],
        },
      }
    }

    const attempt = [...state.candidates.values()].filter((c) => c.field === field).length + 1

    const normalizedValue = normalizeFieldValue(field, input.value)
    const verdict = validateField({
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

    state.candidates.set(candidate.candidateId, candidate)

    const decision = decide(candidate, policy)
    state.decisions.push(decision)

    if (decision.action === GateAction.EscalateHuman) {
      markEscalated(state, field)
    }
    if (decision.action === GateAction.AbortField) {
      markAborted(state, field)
    }

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
        note:
          decision.reasonCode === ReasonCode.LasaHit
            ? "asked regardless of confidence by design"
            : null,
      },
    }
  })

  return NextResponse.json(payload, { status })
}
