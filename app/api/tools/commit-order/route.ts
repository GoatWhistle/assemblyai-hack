import { NextResponse } from "next/server"
import { z } from "zod"
import { withStatus } from "@/domain"
import { sessionStore } from "@/sessions"
import { hasEscalation, intakeFor, missingCritical, runTool } from "@/tools"
import { identifierField, utteranceField } from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

const schema = z.object({
  session_id: identifierField(),
  full_order_read_back: utteranceField(),
  caller_confirmed: z.boolean(),
})

function spoken(fields: readonly string[]): string {
  const words = fields.map((f) => f.replace(/_/g, " "))
  if (words.length === 1) {
    return String(words[0])
  }
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`
}

export async function POST(request: Request): Promise<NextResponse> {
  const { status, payload } = await runTool(request, schema, async (input) => {
    const state = intakeFor(input.session_id)

    if (state.order.status === "committed") {
      return {
        committed: true,
        reason_code: "COMMIT_REFUSED_ALREADY_COMMITTED",
        order_id: state.order.orderId,
        say_to_caller: `That order is already placed. Reference ${state.order.orderId}.`,
      }
    }

    if (!input.caller_confirmed) {
      return {
        committed: false,
        reason_code: "COMMIT_REFUSED_NO_FULL_READBACK",
        say_to_caller:
          "I have not had your confirmation on the full order yet. Let me read it back to you.",
        gate_note: "caller_confirmed was false; the agent may not set it on its own judgement",
      }
    }

    if (hasEscalation(state)) {
      return {
        committed: false,
        reason_code: "COMMIT_REFUSED_ESCALATED",
        escalated_fields: [...state.escalated],
        say_to_caller:
          "I cannot place this order. A pharmacist has to take one of these fields directly.",
        gate_note: "a field was escalated to a human, so the order is marked needs_pharmacist",
      }
    }

    const missing = missingCritical(state)

    if (missing.length > 0) {
      return {
        committed: false,
        reason_code: "COMMIT_REFUSED_MISSING_CRITICAL",
        missing_critical: [...missing],
        say_to_caller: `I cannot place this order yet. I still need ${spoken(missing)}.`,
        gate_note:
          "Order.setField accepts ConfirmedValue only; these fields have no ConfirmedValue.",
      }
    }

    state.order = withStatus(state.order, "committed")

    const fields: Record<string, unknown> = {}
    for (const [field, value] of state.order.fields) {
      fields[field] = {
        value: value.value,
        mode: value.confirmationMode,
        candidate_id: value.candidateId,
      }
    }

    await sessionStore().put({
      sessionId: state.sessionId,
      startedAt: state.startedAt,
      endedAt: new Date().toISOString(),
      decisions: state.decisions,
      events: state.events,
      closes: [],
      gateEnabled: state.gateEnabled,
      orderId: state.order.orderId,
      committed: true,
    })

    return {
      committed: true,
      order_id: state.order.orderId,
      fields,
      full_order_read_back: input.full_order_read_back,
      say_to_caller: `The order is placed. Reference ${state.order.orderId}.`,
    }
  })

  return NextResponse.json(payload, { status })
}
