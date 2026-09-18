import { NextResponse } from "next/server"
import { z } from "zod"
import { ConfirmationMode, FIELD_NAMES, type FieldName, GateAction, policyFor } from "@/domain"
import { confirm } from "@/gate"
import { intakeFor, recordEvent, rememberAgentLine, runTool, writeConfirmed } from "@/tools"
import {
  identifierField,
  optionalUtteranceField,
  sessionIdField,
  utteranceField,
} from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

const CONFIRMING = [
  "yes",
  "yeah",
  "correct",
  "that's right",
  "thats right",
  "confirmed",
  "right",
]
const DENYING = ["no", "nope", "wrong", "not quite", "negative"]

const schema = z.object({
  session_id: sessionIdField(),
  field: z.enum(FIELD_NAMES as [FieldName, ...FieldName[]]),
  candidate_id: identifierField(),
  utterance: utteranceField(),
  style: z.enum(["plain", "spell_out"]).optional(),
  caller_answer: optionalUtteranceField(),
})

export function classifyAnswer(
  answer: string | undefined,
): "confirmed" | "rejected" | "unclear" {
  if (answer === undefined) {
    return "unclear"
  }
  const text = answer
    .trim()
    .toLowerCase()
    .replace(/[.!?,]/g, "")
  if (CONFIRMING.some((c) => text === c || text.startsWith(`${c} `))) {
    return "confirmed"
  }
  if (DENYING.some((d) => text === d || text.startsWith(`${d} `))) {
    return "rejected"
  }
  return "unclear"
}

export async function POST(request: Request): Promise<NextResponse> {
  const { status, payload } = await runTool(request, schema, (input) => {
    const state = intakeFor(input.session_id)
    const style = input.style ?? "plain"

    state.readBack = {
      field: input.field,
      candidateId: input.candidate_id,
      utterance: input.utterance,
      style,
    }
    rememberAgentLine(state, input.utterance)
    recordEvent(state, "read_back_requested", {
      field: input.field,
      detail: { candidateId: input.candidate_id, style },
    })
    if (style === "spell_out") {
      recordEvent(state, "spell_out_entered", {
        field: input.field,
        detail: { candidateId: input.candidate_id },
      })
    }

    const answer = classifyAnswer(input.caller_answer)

    if (answer !== "confirmed") {
      recordEvent(state, "read_back_failed", {
        field: input.field,
        detail: { candidateId: input.candidate_id, answer },
      })
      return {
        registered: true,
        field: input.field,
        candidate_id: input.candidate_id,
        awaiting: "yes_no",
        answer,
        written_to_order: false,
      }
    }

    const candidate = state.candidates.get(input.candidate_id)
    const decision = [...state.decisions]
      .reverse()
      .find((d) => d.candidateId === input.candidate_id)

    if (candidate === undefined || decision === undefined) {
      recordEvent(state, "read_back_failed", {
        field: input.field,
        detail: { candidateId: input.candidate_id, cause: "no_decision" },
      })
      return {
        registered: true,
        field: input.field,
        candidate_id: input.candidate_id,
        awaiting: "yes_no",
        answer,
        written_to_order: false,
        error: "no gate decision exists for that candidate_id, so nothing can be confirmed",
      }
    }

    if (candidate.field !== input.field) {
      recordEvent(state, "read_back_failed", {
        field: candidate.field,
        detail: { candidateId: input.candidate_id, cause: "field_mismatch" },
      })
      return {
        registered: true,
        field: candidate.field,
        candidate_id: input.candidate_id,
        awaiting: "yes_no",
        answer,
        written_to_order: false,
        error: `candidate ${input.candidate_id} was proved for ${candidate.field}, not for ${input.field}; a value is confirmed under the field it was proved for or not at all`,
      }
    }

    const mode = style === "spell_out" ? ConfirmationMode.SpellOut : ConfirmationMode.ReadBack

    const value = confirm({
      candidate,
      policy: policyFor(candidate.field),
      decision,
      confirmationMode:
        decision.action === GateAction.Accept ? ConfirmationMode.Validator : mode,
      callerConfirmed: true,
    })

    writeConfirmed(state, value)
    recordEvent(state, "read_back_matched", {
      field: candidate.field,
      detail: { candidateId: input.candidate_id },
    })

    return {
      registered: true,
      field: candidate.field,
      candidate_id: input.candidate_id,
      awaiting: null,
      answer,
      written_to_order: true,
      confirmation_mode: value.confirmationMode,
      read_back_utterance: input.utterance,
    }
  })

  return NextResponse.json(payload, { status })
}
