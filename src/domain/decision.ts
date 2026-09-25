import type { ConfirmationMode, FieldName, GateAction } from "./enums"
import type { ReasonCode } from "./reason-codes"
import type { EvidenceValue } from "./verdict"

export type DecisionEvidence = Readonly<
  Record<string, EvidenceValue | readonly EvidenceValue[]>
>

export type GateDecision = {
  readonly action: GateAction
  readonly reasonCode: ReasonCode
  readonly field: FieldName
  readonly candidateId: string
  readonly agentUtterance: string
  readonly evidence: DecisionEvidence
  readonly confirmationMode: ConfirmationMode | null
}
