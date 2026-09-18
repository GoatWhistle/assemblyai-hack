import type { FieldCandidate } from "@/domain"

export type PriorAttempt = {
  readonly attempt: number
  readonly rawValue: string
  readonly normalizedValue: string | null
  readonly minConfidence: number
}

const NO_PRIOR_ATTEMPT: null = null

function displayOf(candidate: FieldCandidate): string | null {
  return candidate.normalizedValue === null ? null : String(candidate.normalizedValue)
}

export function priorAttemptOf(
  candidate: FieldCandidate,
  all: readonly FieldCandidate[],
): PriorAttempt | null {
  let best: FieldCandidate | null = null
  for (const entry of all) {
    if (entry.field !== candidate.field) {
      continue
    }
    if (entry.candidateId === candidate.candidateId) {
      continue
    }
    if (entry.attempt >= candidate.attempt) {
      continue
    }
    if (best === null || entry.attempt > best.attempt) {
      best = entry
    }
  }
  if (best === null) {
    return NO_PRIOR_ATTEMPT
  }
  return {
    attempt: best.attempt,
    rawValue: best.rawValue,
    normalizedValue: displayOf(best),
    minConfidence: best.provenance.minConfidence,
  }
}

export function valueChanged(prior: PriorAttempt, candidate: FieldCandidate): boolean {
  return prior.normalizedValue !== displayOf(candidate) || prior.rawValue !== candidate.rawValue
}
