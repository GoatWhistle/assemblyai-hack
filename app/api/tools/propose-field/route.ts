import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { FIELD_NAMES, type FieldName } from "@/domain"
import { recordIntakeEvent, runSessionTool } from "@/tools"
import { spokenValueField, utteranceField } from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

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
      const { outcome } = await recordIntakeEvent(sessionId, {
        type: "proposal",
        atMs: Date.now(),
        candidateId: randomUUID(),
        field: input.field,
        value: input.value,
        transcriptHint: input.transcript_hint,
      })
      return outcome
    },
  )

  return NextResponse.json(payload, { status })
}
