import { CandidateStatus, type FieldName } from "./enums"
import { cleanLasaRisk, type LasaRisk } from "./lasa"
import type { Provenance } from "./provenance"
import type { ValidatorVerdict } from "./verdict"

export type NormalizedValue = string | number | null

export type FieldCandidate = {
  readonly candidateId: string
  readonly field: FieldName
  readonly rawValue: string
  readonly normalizedValue: NormalizedValue
  readonly provenance: Provenance
  readonly verdict: ValidatorVerdict
  readonly lasa: LasaRisk
  readonly status: CandidateStatus
  readonly attempt: number
  readonly createdAt: string
}

export function makeCandidate(input: {
  candidateId: string
  field: FieldName
  rawValue: string
  normalizedValue: NormalizedValue
  provenance: Provenance
  verdict: ValidatorVerdict
  lasa?: LasaRisk
  status?: CandidateStatus
  attempt?: number
  createdAt?: string
}): FieldCandidate {
  const attempt = input.attempt ?? 1
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new RangeError(`attempt must be an integer of at least 1, got ${attempt}`)
  }
  return Object.freeze({
    candidateId: input.candidateId,
    field: input.field,
    rawValue: input.rawValue,
    normalizedValue: input.normalizedValue,
    provenance: input.provenance,
    verdict: input.verdict,
    lasa: input.lasa ?? cleanLasaRisk(),
    status: input.status ?? CandidateStatus.Proposed,
    attempt,
    createdAt: input.createdAt ?? new Date().toISOString(),
  })
}
