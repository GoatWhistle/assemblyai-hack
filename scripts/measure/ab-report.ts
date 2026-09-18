import { FieldName, GateAction, VerdictOutcome } from "../../src/domain"
import { policyFor } from "../../src/domain/policy"
import { makeProvenance } from "../../src/domain/provenance"
import { makeWordSpan } from "../../src/domain/word-span"
import { decide } from "../../src/gate"
import { lasaRiskFor } from "../../src/lasa"
import type { AbCase } from "./ab-corpus"

export type AbOutcome = {
  readonly entry: AbCase
  readonly accepted: boolean
  readonly asked: boolean
}

export type AbSummary = {
  readonly wrongWritten: number
  readonly caught: number
  readonly falseAsks: number
  readonly askRate: number
  readonly mishearings: number
  readonly correctValues: number
}

const FIELD = FieldName.DrugName

function candidateFor(entry: AbCase, lasaChecked: boolean) {
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
    lasa: lasaChecked
      ? lasaRiskFor(entry.recognized)
      : { hit: false, pairedWith: [], source: null, sourceRow: null },
    attempt: 1,
  }
}

export function runAbCase(entry: AbCase, lasaChecked: boolean): AbOutcome {
  const policy = { ...policyFor(FIELD), lasaChecked, readBackAlways: false }
  const decision = decide(candidateFor(entry, lasaChecked) as never, policy)
  const accepted = decision.action === GateAction.Accept
  return { entry, accepted, asked: !accepted }
}

export function summarise(outcomes: readonly AbOutcome[]): AbSummary {
  const misheard = outcomes.filter((o) => o.entry.misheard)
  const correct = outcomes.filter((o) => !o.entry.misheard)
  const wrongWritten = misheard.filter((o) => o.accepted).length
  const caught = misheard.filter((o) => o.asked).length
  const falseAsks = correct.filter((o) => o.asked).length
  return {
    wrongWritten,
    caught,
    falseAsks,
    askRate:
      outcomes.length === 0 ? 0 : outcomes.filter((o) => o.asked).length / outcomes.length,
    mishearings: misheard.length,
    correctValues: correct.length,
  }
}
