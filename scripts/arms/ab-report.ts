import { FieldName, type FieldPolicy, VerdictOutcome } from "../../src/domain"
import { makeProvenance } from "../../src/domain/provenance"
import { makeWordSpan } from "../../src/domain/word-span"
import { decide } from "../../src/gate"
import { lasaRiskFor } from "../../src/lasa"
import type { AbCase } from "./ab-corpus"
import { type Branch, branchOf, reflexYesWrites } from "./shipped-policy"

export type AbOutcome = {
  readonly entry: AbCase
  readonly branch: Branch
}

export type AbSummary = {
  readonly mishearings: number
  readonly correctValues: number
  readonly writtenUnasked: number
  readonly reflexWrites: number
  readonly contrastiveOnErrors: number
  readonly askedCorrect: number
  readonly contrastiveOnCorrect: number
  readonly thresholdOnCorrect: number
  readonly standingOnCorrect: number
}

const FIELD = FieldName.DrugName

function candidateFor(entry: AbCase) {
  const words = [
    makeWordSpan({
      text: entry.recognized,
      startMs: 1000,
      endMs: 1600,
      confidence: entry.confidence,
    }),
  ]
  return {
    candidateId: entry.id,
    field: FIELD,
    rawValue: entry.recognized,
    normalizedValue: entry.recognized,
    provenance: makeProvenance({
      words,
      turnOrder: 1,
      transcriptSlice: entry.recognized,
      sessionId: entry.id,
    }),
    verdict: {
      outcome: VerdictOutcome.Passed,
      validatorName: "ndc_catalog" as const,
      ruleCited: "existence in the built NDC catalogue",
      detail: "catalogue hit",
      checkedValue: entry.recognized,
      evidence: { kind: "catalog" as const, rows: 1 },
    },
    lasa: lasaRiskFor(entry.recognized),
    attempt: 1,
  }
}

export function runAbCase(entry: AbCase, policy: FieldPolicy): AbOutcome {
  return { entry, branch: branchOf(decide(candidateFor(entry) as never, policy)) }
}

function count(outcomes: readonly AbOutcome[], test: (o: AbOutcome) => boolean): number {
  return outcomes.filter(test).length
}

export function summarise(outcomes: readonly AbOutcome[]): AbSummary {
  const misheard = outcomes.filter((o) => o.entry.misheard)
  const correct = outcomes.filter((o) => !o.entry.misheard)
  return {
    mishearings: misheard.length,
    correctValues: correct.length,
    writtenUnasked: count(misheard, (o) => o.branch === "accepted"),
    reflexWrites: count(misheard, (o) => reflexYesWrites(o.branch)),
    contrastiveOnErrors: count(misheard, (o) => o.branch === "pair_rule"),
    askedCorrect: count(correct, (o) => o.branch !== "accepted"),
    contrastiveOnCorrect: count(correct, (o) => o.branch === "pair_rule"),
    thresholdOnCorrect: count(correct, (o) => o.branch === "confidence_threshold"),
    standingOnCorrect: count(correct, (o) => o.branch === "standing_read_back"),
  }
}
