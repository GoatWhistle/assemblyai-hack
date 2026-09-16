import { NextResponse } from "next/server"
import { z } from "zod"
import { ConfirmationMode, FIELD_NAMES, type FieldName, GateAction, policyFor } from "@/domain"
import { confirm } from "@/gate"
import { intakeFor, runTool, writeConfirmed } from "@/tools"
import { identifierField, optionalUtteranceField, utteranceField } from "@/tools/input-bounds"

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
  session_id: identifierField(),
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
  const text = answer.trim().toLowerCase().replace(/[.!?]/g, "")
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

    const answer = classifyAnswer(input.caller_answer)

    if (answer !== "confirmed") {
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

    const mode = style === "spell_out" ? ConfirmationMode.SpellOut : ConfirmationMode.ReadBack

    const value = confirm({
      candidate,
      policy: policyFor(input.field),
      decision,
      confirmationMode:
        decision.action === GateAction.Accept ? ConfirmationMode.Validator : mode,
      callerConfirmed: true,
    })

    writeConfirmed(state, value)

    return {
      registered: true,
      field: input.field,
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
