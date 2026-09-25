import {
  type ConfirmationEvidence,
  ConfirmationMode,
  CRITICAL_FIELDS,
  type FieldCandidate,
  type FieldName,
  GateAction,
  type GateDecision,
} from "@/domain"
import { GateOutcome, outcomeOf } from "@/features/gate-banner/signature"
import type { LiveOrderSnapshot } from "./live-snapshot"

export type SummaryRow = {
  readonly field: FieldName
  readonly value: string | null
  readonly reasonCode: string | null
  readonly evidence: ConfirmationEvidence | null
}

export type OrderGroups = {
  readonly stopped: readonly SummaryRow[]
  readonly proved: readonly SummaryRow[]
  readonly confirmed: readonly SummaryRow[]
  readonly unresolved: readonly SummaryRow[]
  readonly missingCritical: readonly FieldName[]
  readonly commitBlocked: boolean
  readonly committed: boolean
}

function latestByField(candidates: readonly FieldCandidate[]): Map<FieldName, FieldCandidate> {
  const latest = new Map<FieldName, FieldCandidate>()
  for (const candidate of candidates) {
    const held = latest.get(candidate.field)
    if (held === undefined || candidate.attempt >= held.attempt) {
      latest.set(candidate.field, candidate)
    }
  }
  return latest
}

function shown(candidate: FieldCandidate | undefined): string | null {
  if (candidate === undefined) {
    return null
  }
  return candidate.normalizedValue === null
    ? candidate.rawValue
    : String(candidate.normalizedValue)
}

function isStopped(decision: GateDecision | undefined, evidence: ConfirmationEvidence | null) {
  if (evidence !== null && evidence.verdict === "rejected") {
    return true
  }
  if (decision === undefined) {
    return false
  }
  return (
    decision.action === GateAction.EscalateHuman ||
    decision.action === GateAction.AbortField ||
    outcomeOf(decision) === GateOutcome.Refused
  )
}

function provedByValidator(decision: GateDecision | undefined): boolean {
  return (
    decision !== undefined &&
    decision.action === GateAction.Accept &&
    (decision.confirmationMode === null ||
      decision.confirmationMode === ConfirmationMode.Validator)
  )
}

type GroupName = "stopped" | "proved" | "confirmed" | "unresolved"

function groupOf(
  row: SummaryRow,
  decision: GateDecision | undefined,
  confirmedByServer: boolean,
): GroupName {
  if (row.evidence !== null && row.evidence.verdict === "confirmed" && confirmedByServer) {
    return "confirmed"
  }
  if (provedByValidator(decision)) {
    return "proved"
  }
  return isStopped(decision, row.evidence) ? "stopped" : "unresolved"
}

export function groupOrder(input: {
  readonly candidates: readonly FieldCandidate[]
  readonly decisions: ReadonlyMap<string, GateDecision>
  readonly snapshot: LiveOrderSnapshot | null
}): OrderGroups {
  const latest = latestByField(input.candidates)
  const evidenceOf = new Map<FieldName, ConfirmationEvidence>()
  for (const evidence of input.snapshot?.confirmations ?? []) {
    evidenceOf.set(evidence.field, evidence)
  }
  const confirmedSet = new Set(input.snapshot?.confirmedFields ?? [])
  const grouped: Record<GroupName, SummaryRow[]> = {
    stopped: [],
    proved: [],
    confirmed: [],
    unresolved: [],
  }
  const settled = new Set<FieldName>()
  const fields = new Set<FieldName>([...CRITICAL_FIELDS, ...latest.keys()])

  for (const field of fields) {
    const candidate = latest.get(field)
    const decision =
      candidate === undefined ? undefined : input.decisions.get(candidate.candidateId)
    const evidence = evidenceOf.get(field) ?? null
    const row: SummaryRow = {
      field,
      value: shown(candidate),
      reasonCode: evidence?.reasonCode ?? decision?.reasonCode ?? null,
      evidence,
    }
    const group = groupOf(row, decision, confirmedSet.has(field))
    grouped[group].push(row)
    if (group === "proved" || group === "confirmed") {
      settled.add(field)
    }
  }

  const committed = input.snapshot?.status === "committed"
  const missingCritical = CRITICAL_FIELDS.filter((field) => !settled.has(field))
  return {
    stopped: grouped.stopped,
    proved: grouped.proved,
    confirmed: grouped.confirmed,
    unresolved: grouped.unresolved,
    missingCritical,
    commitBlocked: !committed && missingCritical.length > 0,
    committed,
  }
}
