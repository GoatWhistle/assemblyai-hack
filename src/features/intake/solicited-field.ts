import type { FieldCandidate, FieldName, GateDecision } from "@/domain"
import { GateAction } from "@/domain"
import type { ReadBackContext } from "@/features/read-back/read-back-machine"
import { ReadBackState } from "@/features/read-back/read-back-machine"
import { INTAKE_ORDER } from "./field-language"

export type Solicited = {
  readonly field: FieldName | null
  readonly awaitingConfirmation: boolean
}

export const NOTHING_SOLICITED: Solicited = Object.freeze({
  field: null,
  awaitingConfirmation: false,
})

const AWAITING: readonly ReadBackState[] = [
  ReadBackState.AwaitingConfirmation,
  ReadBackState.SpellOut,
]

export function solicitedField(
  candidates: readonly FieldCandidate[],
  decisions: ReadonlyMap<string, GateDecision>,
  readBack: ReadBackContext,
): Solicited {
  if (readBack.field !== null && AWAITING.includes(readBack.state)) {
    return { field: readBack.field, awaitingConfirmation: true }
  }
  const written = new Set<FieldName>()
  for (const candidate of candidates) {
    if (decisions.get(candidate.candidateId)?.action === GateAction.Accept) {
      written.add(candidate.field)
    }
  }
  const next = INTAKE_ORDER.find((field) => !written.has(field))
  return { field: next ?? null, awaitingConfirmation: false }
}
