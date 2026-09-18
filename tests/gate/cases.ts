import {
  FIELD_NAMES,
  type FieldCandidate,
  type FieldName,
  type FieldPolicy,
  LasaSource,
  makeLasaRisk,
  policyFor,
  type ValidatorName,
  VerdictOutcome,
} from "@/domain"
import { candidateFor } from "./factory"

const OUTCOMES: readonly VerdictOutcome[] = Object.values(VerdictOutcome)
const ATTEMPTS: readonly number[] = [1, 2, 3, 4, 5]
const CONFIDENCES: readonly number[] = [0, 0.5, 0.89, 0.9, 0.94, 0.95, 0.99, 1]
const LASA_STATES: readonly boolean[] = [false, true]
const NORMALIZABLE: readonly boolean[] = [false, true]
const REFILL_VALIDATORS: readonly ValidatorName[] = ["schedule_refills", "ndc_catalog"]

export type GateCase = {
  readonly candidate: FieldCandidate
  readonly policy: FieldPolicy
  readonly label: string
}

type Axes = {
  readonly field: FieldName
  readonly outcome: VerdictOutcome
  readonly attempt: number
  readonly confidence: number
  readonly lasaHit: boolean
  readonly normalizable: boolean
  readonly validatorName: ValidatorName
}

function seedRows(): Axes[] {
  return FIELD_NAMES.map((field) => ({
    field: field as FieldName,
    outcome: VerdictOutcome.Passed,
    attempt: 1,
    confidence: 1,
    lasaHit: false,
    normalizable: true,
    validatorName: "ndc_catalog" as ValidatorName,
  }))
}

function everyCombination(): readonly Axes[] {
  let rows = seedRows()
  const expand = <T>(values: readonly T[], key: keyof Axes): void => {
    const next: Axes[] = []
    for (const row of rows) {
      for (const value of values) {
        next.push({ ...row, [key]: value })
      }
    }
    rows = next
  }
  expand(OUTCOMES, "outcome")
  expand(ATTEMPTS, "attempt")
  expand(CONFIDENCES, "confidence")
  expand(LASA_STATES, "lasaHit")
  expand(NORMALIZABLE, "normalizable")
  expand(REFILL_VALIDATORS, "validatorName")
  return rows
}

function toCase(axes: Axes): GateCase {
  const candidate = candidateFor({
    field: axes.field,
    rawValue: "spoken value",
    normalizedValue: axes.normalizable ? "spoken value" : null,
    confidence: axes.confidence,
    outcome: axes.outcome,
    validatorName: axes.validatorName,
    attempt: axes.attempt,
    lasa: axes.lasaHit
      ? makeLasaRisk({
          matchedTerm: "lisinopril",
          confusableWith: ["bisoprolol"],
          source: LasaSource.Ismp2023,
          sourceRow: "row-1",
        })
      : undefined,
  })
  return {
    candidate,
    policy: policyFor(axes.field),
    label: `${axes.field}/${axes.outcome}/attempt=${axes.attempt}/conf=${axes.confidence}/lasa=${axes.lasaHit}/normalizable=${axes.normalizable}/validator=${axes.validatorName}`,
  }
}

export function buildGateCases(): readonly GateCase[] {
  return everyCombination().map(toCase)
}
