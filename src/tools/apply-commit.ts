import { comboSourceFor } from "@/catalog"
import { FieldName, referenceNumberFor, VerdictOutcome, withStatus } from "@/domain"
import { lasaRiskFor } from "@/lasa"
import { validateCombo } from "@/validators"
import { toolCatalog } from "./catalog-access"
import { hasEscalation, missingByOutcome, missingCritical } from "./field-outcomes"
import { type IntakeState, recordEvent } from "./intake"
import type { IntakeEvent } from "./intake-events"
import type { ToolPayload } from "./respond"

type CommitEvent = Extract<IntakeEvent, { type: "commit" }>

function spelled(reference: string): string {
  return reference.split("").join(" ")
}

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

const MAX_COMMIT_REFUSALS = 50

function noteRefusal(
  state: IntakeState,
  reasonCode: string,
  missing: readonly FieldName[] = [],
): void {
  recordEvent(state, "order_refused", { detail: { reasonCode } })
  state.commitRefusals = [
    ...state.commitRefusals,
    { atMs: state.nowMs, missing: [...missing], reasonCode },
  ].slice(-MAX_COMMIT_REFUSALS)
}

const COMBINATION_FIELDS: readonly FieldName[] = [
  FieldName.DrugName,
  FieldName.Strength,
  FieldName.DosageForm,
  FieldName.Route,
]

function confirmedText(state: IntakeState, field: FieldName): string | undefined {
  const value = state.order.fields.get(field)?.value
  return typeof value === "string" ? value : undefined
}

function inconsistentCombination(state: IntakeState): string | null {
  const drugName = confirmedText(state, FieldName.DrugName)
  const strength = confirmedText(state, FieldName.Strength)
  const dosageForm = confirmedText(state, FieldName.DosageForm)
  const route = confirmedText(state, FieldName.Route)
  if (
    drugName === undefined ||
    strength === undefined ||
    dosageForm === undefined ||
    route === undefined
  ) {
    return null
  }
  const verdict = validateCombo(
    { drugName, strength, dosageForm, route },
    {
      ...comboSourceFor(toolCatalog()),
      partnersOf: (name) => lasaRiskFor(name).confusableWith,
    },
  )
  return verdict.outcome === VerdictOutcome.InconsistentCombo ? verdict.detail : null
}

export function applyCommit(state: IntakeState, event: CommitEvent, seq: number): ToolPayload {
  if (state.order.status === "committed") {
    return {
      committed: true,
      reason_code: "COMMIT_REFUSED_ALREADY_COMMITTED",
      order_id: state.order.orderId,
      reference_number: referenceNumberFor(state.order.orderId),
      say_to_caller: `That order is already placed. Reference ${spelled(referenceNumberFor(state.order.orderId))}.`,
    }
  }

  if (!event.callerConfirmed) {
    noteRefusal(state, "COMMIT_REFUSED_NO_FULL_READBACK", missingCritical(state))
    return {
      committed: false,
      reason_code: "COMMIT_REFUSED_NO_FULL_READBACK",
      say_to_caller:
        "I have not had your confirmation on the full order yet. Let me read it back to you.",
      gate_note: "caller_confirmed was false; the agent may not set it on its own judgement",
    }
  }

  if (hasEscalation(state)) {
    noteRefusal(state, "COMMIT_REFUSED_ESCALATED", [...state.escalated])
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
    noteRefusal(state, "COMMIT_REFUSED_MISSING_CRITICAL", missing)
    return {
      committed: false,
      reason_code: "COMMIT_REFUSED_MISSING_CRITICAL",
      missing_critical: [...missing],
      never_asked: [...byOutcome.never_asked],
      refused_by_gate: [...byOutcome.refused_by_gate],
      abandoned: [...byOutcome.abandoned],
      say_to_caller: missingCriticalMessage({
        neverAsked: byOutcome.never_asked,
        refused: byOutcome.refused_by_gate,
        abandoned: byOutcome.abandoned,
      }),
      gate_note:
        "Order.setField accepts ConfirmedValue only. Confirmed, refused and never-asked are three states, and reporting them as one absence would put a lie in the record.",
    }
  }

  const combination = inconsistentCombination(state)
  if (combination !== null) {
    noteRefusal(state, "COMMIT_REFUSED_INCONSISTENT_COMBINATION", [...COMBINATION_FIELDS])
    return {
      committed: false,
      reason_code: "COMMIT_REFUSED_INCONSISTENT_COMBINATION",
      inconsistent_fields: [...COMBINATION_FIELDS],
      say_to_caller:
        "I cannot place this order yet. The drug, strength, form and route I have do not go together as one product, so let me check them with you again.",
      gate_note: `each field was confirmed on its own, but the confirmed combination is checked as a whole before anything is written: ${combination}`,
    }
  }

  state.order = withStatus(state.order, "committed")
  state.committedSeq = seq
  state.committedAtMs = event.atMs
  recordEvent(state, "order_committed", { detail: { orderId: state.order.orderId } })

  const fields: Record<string, unknown> = {}
  for (const [field, value] of state.order.fields) {
    fields[field] = {
      value: value.value,
      mode: value.confirmationMode,
      candidate_id: value.candidateId,
    }
  }

  return {
    committed: true,
    order_id: state.order.orderId,
    fields,
    full_order_read_back: event.fullOrderReadBack,
    reference_number: referenceNumberFor(state.order.orderId),
    say_to_caller: `The order is placed. Reference ${spelled(referenceNumberFor(state.order.orderId))}. It is awaiting pharmacist verification.`,
  }
}
