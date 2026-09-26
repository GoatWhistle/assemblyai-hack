import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { FIELD_NAMES, type FieldName } from "@/domain"
import { awaitQuotedTurn, recordIntakeEvent, runSessionTool } from "@/tools"
import { spokenValueField, utteranceField } from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

export const maxDuration = 15

const schema = z.object({
  field: z.enum(FIELD_NAMES as [FieldName, ...FieldName[]]),
  value: spokenValueField(),
  transcript_hint: utteranceField(),
})

export async function POST(request: Request): Promise<NextResponse> {
  const { status, payload } = await runSessionTool(
    request,
    schema,
    async (input, sessionId) => {
      const waited = await awaitQuotedTurn({ sessionId, hint: input.transcript_hint })
      const { outcome } = await recordIntakeEvent(sessionId, {
        type: "proposal",
        atMs: Date.now(),
        candidateId: randomUUID(),
        field: input.field,
        value: input.value,
        transcriptHint: input.transcript_hint,
      })
      return { status: outcome.status, payload: { ...outcome.payload, waited } }
    },
  )

  return NextResponse.json(payload, { status })
}
