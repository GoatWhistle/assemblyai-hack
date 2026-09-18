import { NextResponse } from "next/server"
import { z } from "zod"
import { withStatus } from "@/domain"
import { originFromEnv, sessionStore } from "@/sessions"
import {
  hasEscalation,
  intakeFor,
  missingByOutcome,
  missingCritical,
  recordEvent,
  runTool,
} from "@/tools"
import { sessionIdField, utteranceField } from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

const schema = z.object({
  session_id: sessionIdField(),
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

function missingCriticalMessage(input: {
  neverAsked: readonly string[]
  refused: readonly string[]
  abandoned: readonly string[]
}): string {
  const sentences: string[] = []
  if (input.neverAsked.length > 0) {
    sentences.push(`I still need ${spoken(input.neverAsked)}`)
  }
  if (input.refused.length > 0) {
    sentences.push(
      `${spoken(input.refused)} was proposed but the gate did not accept it, so asking for it the same way again will not help`,
    )
  }
  if (input.abandoned.length > 0) {
    sentences.push(`${spoken(input.abandoned)} was left for the pharmacy to fill in`)
  }
  return `I cannot place this order yet. ${sentences.join(". ")}.`
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
      recordEvent(state, "order_refused", {
        detail: { reasonCode: "COMMIT_REFUSED_NO_FULL_READBACK" },
      })
      return {
        committed: false,
        reason_code: "COMMIT_REFUSED_NO_FULL_READBACK",
        say_to_caller:
          "I have not had your confirmation on the full order yet. Let me read it back to you.",
        gate_note: "caller_confirmed was false; the agent may not set it on its own judgement",
      }
    }

    if (hasEscalation(state)) {
      recordEvent(state, "order_refused", {
        detail: { reasonCode: "COMMIT_REFUSED_ESCALATED" },
      })
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
      const byOutcome = missingByOutcome(state)
      const refused = byOutcome.refused_by_gate
      const abandoned = byOutcome.abandoned
      const neverAsked = byOutcome.never_asked
      recordEvent(state, "order_refused", {
        detail: { reasonCode: "COMMIT_REFUSED_MISSING_CRITICAL" },
      })
      return {
        committed: false,
        reason_code: "COMMIT_REFUSED_MISSING_CRITICAL",
        missing_critical: [...missing],
        never_asked: [...neverAsked],
        refused_by_gate: [...refused],
        abandoned: [...abandoned],
        say_to_caller: missingCriticalMessage({
          neverAsked: [...neverAsked],
          refused: [...refused],
          abandoned: [...abandoned],
        }),
        gate_note:
          "Order.setField accepts ConfirmedValue only. Confirmed, refused and never-asked are three states, and reporting them as one absence would put a lie in the record.",
      }
    }

    state.order = withStatus(state.order, "committed")
    recordEvent(state, "order_committed", { detail: { orderId: state.order.orderId } })

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
      origin: originFromEnv(process.env),
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
