import { NextResponse } from "next/server"
import { z } from "zod"
import { originFromEnv, sessionStore } from "@/sessions"
import { receiptOf, recordIntakeEvent, runSessionTool } from "@/tools"
import { utteranceField } from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

export const maxDuration = 15

const schema = z.object({
  full_order_read_back: utteranceField(),
  caller_confirmed: z.boolean(),
})

export async function POST(request: Request): Promise<NextResponse> {
  const { status, payload } = await runSessionTool(
    request,
    schema,
    async (input, sessionId) => {
      const { state, seq, outcome } = await recordIntakeEvent(sessionId, {
        type: "commit",
        atMs: Date.now(),
        fullOrderReadBack: input.full_order_read_back,
        callerConfirmed: input.caller_confirmed,
      })

      if (state.committedSeq === seq) {
        const origin = originFromEnv(process.env)
        await sessionStore().put({
          sessionId: state.sessionId,
          startedAt: state.startedAt,
          endedAt: new Date(state.nowMs).toISOString(),
          decisions: state.decisions,
          events: state.events,
          closes: [],
          gateEnabled: state.gateEnabled,
          origin,
          orderId: state.order.orderId,
          committed: true,
          receipt: await receiptOf(state, origin),
        })
      }

      return outcome
    },
  )

  return NextResponse.json(payload, { status })
}
