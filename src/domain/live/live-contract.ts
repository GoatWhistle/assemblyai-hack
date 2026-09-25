import type { GateDecision } from "../decision"
import type { ConfirmationMode, FieldName } from "../enums"
import type { OrderStatus } from "../order"
import type { Provenance } from "../provenance"
import type { TokenResponseFields } from "../token-response"
import type { ValidatorVerdict } from "../verdict"
import type { WordSpan } from "../word-span"
import type { OrderWitness } from "./witness-contract"

export type SessionBinding = {
  readonly sessionId: string
  readonly agentId: string
}

export type AgentTokenResponse = TokenResponseFields & SessionBinding

export const UNKNOWN_SESSION_CODE = "E_UNKNOWN_SESSION"

export type UnknownSessionRefusal = {
  readonly code: typeof UNKNOWN_SESSION_CODE
  readonly error: string
}

export type AgentTurnStatus = "completed" | "interrupted"

export type AgentTurn = {
  readonly role: "agent"
  readonly replyId: string
  readonly text: string
  readonly status: AgentTurnStatus
  readonly playedMs: number
  readonly durationMs: number
}

export type CallerTurnWord = {
  readonly text: string
  readonly start: number
  readonly end: number
  readonly confidence: number
}

export type CallerTurnBody = {
  readonly role?: "caller"
  readonly turnOrder: number
  readonly transcript: string
  readonly isFormatted: boolean
  readonly words: readonly CallerTurnWord[]
}

export type RecognizerReport = {
  readonly role: "recognizer"
  readonly model: string | null
  readonly expectedModel: string
}

export type TurnBody = CallerTurnBody | AgentTurn | RecognizerReport

export const READ_BACK_PLAYED_TOLERANCE_MS = 300

export type ConfirmationVerdict = "confirmed" | "rejected" | "unclear"

export const ConfirmationReason = {
  CallerAffirmed: "C_CALLER_AFFIRMED",
  CallerNamedValue: "C_CALLER_NAMED_VALUE",
  NoReadBackTurn: "E_NO_READBACK_TURN",
  ReadBackNotContrastive: "E_READBACK_NOT_CONTRASTIVE",
  LasaNamedAnswerRequired: "E_LASA_NAMED_ANSWER_REQUIRED",
  CallerNamedPartner: "E_CALLER_NAMED_LASA_PARTNER",
  ReadBackInterrupted: "E_READBACK_INTERRUPTED",
  NoCallerAnswer: "E_NO_CALLER_ANSWER",
  CallerNegated: "E_CALLER_NEGATED",
  CallerCorrected: "E_CALLER_CORRECTED",
  CallerRepeatMismatch: "E_CALLER_REPEAT_MISMATCH",
  CallerBackchannel: "E_CALLER_BACKCHANNEL",
  CallerUnclear: "E_CALLER_UNCLEAR",
  EchoTurn: "E_ECHO_TURN",
  Superseded: "E_SUPERSEDED_BY_NEWER_TURN",
} as const

export type ConfirmationReason = (typeof ConfirmationReason)[keyof typeof ConfirmationReason]

export const STALE_PROPOSAL_CODE = "E_STALE_PROPOSAL"

export const RETRACTED_VALUE_CODE = "E_RETRACTED_VALUE"

export type ReadBackTurnEvidence = {
  readonly replyId: string
  readonly text: string
  readonly completed: boolean
  readonly playedMs: number
  readonly durationMs: number
}

export type CallerTurnEvidence = {
  readonly turnOrder: number
  readonly transcript: string
  readonly words: readonly WordSpan[]
}

export type ConfirmationEvidence = {
  readonly field: FieldName
  readonly candidateId: string
  readonly readBack: ReadBackTurnEvidence | null
  readonly callerTurn: CallerTurnEvidence | null
  readonly verdict: ConfirmationVerdict
  readonly reasonCode: ConfirmationReason
  readonly callerAnswerHint: string | null
}

export const ORDER_RECEIPT_SCHEMA_VERSION = 1

export const NO_RECEIPT_CODE = "E_NO_RECEIPT"

export type ReceiptField = {
  readonly field: FieldName
  readonly value: string | number
  readonly candidateId: string
  readonly confirmationMode: ConfirmationMode
  readonly provenance: Provenance
  readonly verdict: ValidatorVerdict
  readonly confirmation: ConfirmationEvidence | null
}

export type OrderReceipt = {
  readonly schemaVersion: typeof ORDER_RECEIPT_SCHEMA_VERSION
  readonly orderId: string
  readonly sessionId: string
  readonly fields: readonly ReceiptField[]
  readonly actualModel: string | null
  readonly origin: string
  readonly committedAt: string
  readonly witness?: OrderWitness
  readonly sha256: string
}

export type BudgetStatus = {
  readonly remainingSeconds: number
  readonly exhausted: boolean
}

export type DeployHealth = {
  readonly model: string
  readonly tokenExpiresInSeconds: number
  readonly maxSessionDurationSeconds: number
  readonly budget: BudgetStatus
  readonly rateBrakeNote: string
  readonly buildSha: string | null
}

export type RunOutcome = "completed" | "failed" | "inconclusive"

export type RunKind =
  | "acceptance_call"
  | "eval_live"
  | "recorded_session"
  | "probe"
  | "live_smoke"

export type RunRecord = {
  readonly runId: string
  readonly recordedAt: string
  readonly kind: RunKind
  readonly command: string
  readonly outcome: RunOutcome
  readonly reason: string
  readonly socketSeconds: number
  readonly costUsd: number
  readonly sessionIds: readonly string[]
  readonly boundaries: readonly string[]
}

export type CommitRefusalSnapshot = {
  readonly atMs: number
  readonly missing: readonly FieldName[]
  readonly reasonCode: string
}

export type LiveOrderSnapshot = {
  readonly orderId: string
  readonly referenceNumber: string
  readonly status: OrderStatus
  readonly confirmedFields: readonly FieldName[]
  readonly abortedFields: readonly FieldName[]
  readonly confirmations: readonly ConfirmationEvidence[]
  readonly commitRefusals: readonly CommitRefusalSnapshot[]
  readonly awaitingConfirmation: {
    readonly field: FieldName
    readonly candidateId: string
    readonly sinceMs: number
  } | null
  readonly actualModel: string | null
}

export const DEMO_SCENARIOS = [
  "unsupported_value",
  "unknown_value",
  "fluent_wrong_partner",
] as const

export type DemoScenario = (typeof DEMO_SCENARIOS)[number]

export type DemoRunResult = {
  readonly scenario: DemoScenario
  readonly description: string
  readonly spoken: string
  readonly proposedValue: string
  readonly decision: GateDecision
  readonly reasonCode: string
  readonly sayToCaller: string | null
  readonly writtenToOrder: false
}

export type BenchmarkInput = "live socket" | "tts" | "text" | "fixture"

export type BenchmarkRow = {
  readonly figure: string
  readonly value: string | null
  readonly input: BenchmarkInput
  readonly command: string
  readonly n: number | null
  readonly measuredOn: string | null
}

export const REFERENCE_NUMBER_LENGTH = 6

export function referenceNumberFor(orderId: string): string {
  const alphanumeric = orderId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  return alphanumeric.slice(-REFERENCE_NUMBER_LENGTH)
}
