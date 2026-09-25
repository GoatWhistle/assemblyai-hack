import { CRITICAL_FIELDS, type FieldName, missingFields } from "@/domain"
import type { IntakeState } from "./intake"

export function missingCritical(state: IntakeState): readonly FieldName[] {
  return missingFields(state.order, CRITICAL_FIELDS)
}

export type FieldOutcome = "never_asked" | "refused_by_gate" | "abandoned"

export function outcomeFor(state: IntakeState, field: FieldName): FieldOutcome {
  if (state.order.abortedFields.includes(field)) {
    return "abandoned"
  }
  const attempts = [...state.candidates.values()].filter((c) => c.field === field)
  return attempts.length === 0 ? "never_asked" : "refused_by_gate"
}

export function missingByOutcome(
  state: IntakeState,
): Readonly<Record<FieldOutcome, readonly FieldName[]>> {
  const grouped: Record<FieldOutcome, FieldName[]> = {
    never_asked: [],
    refused_by_gate: [],
    abandoned: [],
  }
  for (const field of missingCritical(state)) {
    grouped[outcomeFor(state, field)].push(field)
  }
  return Object.freeze({
    never_asked: Object.freeze(grouped.never_asked),
    refused_by_gate: Object.freeze(grouped.refused_by_gate),
    abandoned: Object.freeze(grouped.abandoned),
  })
}

export function hasEscalation(state: IntakeState): boolean {
  return state.escalated.size > 0
}
