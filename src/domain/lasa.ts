import { LasaSource } from "./enums"

export type LasaRisk = {
  readonly hit: boolean
  readonly matchedTerm: string | null
  readonly confusableWith: readonly string[]
  readonly source: LasaSource
  readonly sourceRow: string | null
}

export function cleanLasaRisk(): LasaRisk {
  return Object.freeze({
    hit: false,
    matchedTerm: null,
    confusableWith: Object.freeze([]),
    source: LasaSource.None,
    sourceRow: null,
  })
}

export function makeLasaRisk(input: {
  matchedTerm: string
  confusableWith: readonly string[]
  source: LasaSource
  sourceRow?: string | null
}): LasaRisk {
  return Object.freeze({
    hit: true,
    matchedTerm: input.matchedTerm,
    confusableWith: Object.freeze([...input.confusableWith]),
    source: input.source,
    sourceRow: input.sourceRow ?? null,
  })
}
