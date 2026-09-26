import { NextResponse } from "next/server"
import { z } from "zod"
import { FIELD_NAMES, type FieldName } from "@/domain"
import { awaitCallerAnswer, recordIntakeEvent, runSessionTool } from "@/tools"
import { identifierField, optionalUtteranceField, utteranceField } from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

export const maxDuration = 15

const schema = z.object({
  field: z.enum(FIELD_NAMES as [FieldName, ...FieldName[]]),
  candidate_id: identifierField(),
  utterance: utteranceField(),
  style: z.enum(["plain", "spell_out"]).optional(),
  caller_answer: optionalUtteranceField(),
})

export async function POST(request: Request): Promise<NextResponse> {
  const { status, payload } = await runSessionTool(
    request,
    schema,
    async (input, sessionId) => {
      const style = input.style ?? "plain"
      if (input.caller_answer === undefined) {
        const { outcome } = await recordIntakeEvent(sessionId, {
          type: "read_back",
          atMs: Date.now(),
          field: input.field,
          candidateId: input.candidate_id,
          utterance: input.utterance,
          style,
        })
        return outcome
      }

      const waited = await awaitCallerAnswer({
        sessionId,
        candidateId: input.candidate_id,
        callerAnswerHint: input.caller_answer,
      })
      const { outcome } = await recordIntakeEvent(sessionId, {
        type: "confirmation",
        atMs: Date.now(),
        field: input.field,
        candidateId: input.candidate_id,
        utterance: input.utterance,
        style,
        callerAnswerHint: input.caller_answer,
      })
      return { status: outcome.status, payload: { ...outcome.payload, waited } }
    },
  )

  return NextResponse.json(payload, { status })
}
