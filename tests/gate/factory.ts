import {
  type FieldCandidate,
  type FieldName,
  type LasaRisk,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  type NormalizedValue,
  type ValidatorName,
  VerdictOutcome,
} from "@/domain"

export function candidateFor(input: {
  field: FieldName
  rawValue?: string
  normalizedValue?: NormalizedValue
  confidence?: number
  outcome?: VerdictOutcome
  validatorName?: ValidatorName
  detail?: string
  lasa?: LasaRisk
  attempt?: number
  evidence?: Readonly<Record<string, string | number | boolean | null>>
}): FieldCandidate {
  const confidence = input.confidence ?? 0.99
  const raw = input.rawValue ?? "spoken value"
  const words = raw.split(" ").map((text, i) =>
    makeWordSpan({
      text,
      startMs: 1000 + i * 300,
      endMs: 1000 + i * 300 + 280,
      confidence,
    }),
  )

  return makeCandidate({
    candidateId: `candidate-${input.field}-${input.attempt ?? 1}`,
    field: input.field,
    rawValue: raw,
    normalizedValue: input.normalizedValue === undefined ? raw : input.normalizedValue,
    provenance: makeProvenance({
      words,
      turnOrder: 2,
      transcriptSlice: raw,
      sessionId: "test-session",
    }),
    verdict: makeVerdict({
      outcome: input.outcome ?? VerdictOutcome.Passed,
      validatorName: input.validatorName ?? "ndc_catalog",
      detail: input.detail ?? "the validator passed this value",
      checkedValue: raw,
      evidence: input.evidence,
    }),
    lasa: input.lasa,
    attempt: input.attempt,
  })
}
