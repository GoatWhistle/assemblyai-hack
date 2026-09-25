import type { CatalogIndex } from "@/catalog"
import type { TurnRecord } from "@/confirmation"
import { normalizeFieldValue, reconcileValue, unsupportedValueVerdict } from "@/confirmation"
import {
  type DemoRunResult,
  type DemoScenario,
  FieldName,
  makeCandidate,
  makeProvenance,
  makeWordSpan,
  policyFor,
  type WordSpan,
} from "@/domain"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import { validateField } from "../validate-field"

type ScenarioScript = {
  readonly description: string
  readonly spoken: string
  readonly heard: readonly (readonly [string, number])[]
  readonly proposedValue: string
  readonly gapMs: number
}

const SCRIPTS: Readonly<Record<DemoScenario, ScenarioScript>> = Object.freeze({
  unsupported_value: {
    description:
      "the caller said lisinopril ten milligrams and the model proposed atorvastatin while quoting that very turn; nothing spoken accounts for the value, so it is refused as unsupported by the speech",
    spoken: "lisinopril ten milligrams",
    heard: [
      ["lisinopril", 0.99],
      ["ten", 0.99],
      ["milligrams", 0.99],
    ],
    proposedValue: "atorvastatin",
    gapMs: 120,
  },
  unknown_value: {
    description:
      "the recognizer returned a name that is in no catalogue entry; the gate asks the caller again and never substitutes the nearest catalogue name",
    spoken: "venorelbine",
    heard: [["venorelbine", 0.99]],
    proposedValue: "venorelbine",
    gapMs: 120,
  },
  fluent_wrong_partner: {
    description:
      "the caller said tramadol fifty milligrams in one fluent breath and the recognizer returned trazodone at certainty 0.99 with no pause anywhere; traMADol - traZODone is a row of the 2023 ISMP list, so the pair branch re-asks however fluent and certain the turn was",
    spoken: "tramadol fifty milligrams",
    heard: [
      ["trazodone", 0.99],
      ["fifty", 0.99],
      ["milligrams", 0.99],
    ],
    proposedValue: "trazodone",
    gapMs: 0,
  },
})

function turnFor(script: ScenarioScript): TurnRecord {
  let cursor = 1000
  const words: WordSpan[] = script.heard.map(([text, confidence]) => {
    const startMs = cursor
    const endMs = startMs + 200 + text.length * 40
    cursor = endMs + script.gapMs
    return makeWordSpan({ text, startMs, endMs, confidence })
  })
  return {
    turnOrder: 1,
    transcript: script.heard.map(([text]) => text).join(" "),
    isFormatted: false,
    words,
  }
}

export function runScenario(input: {
  scenario: DemoScenario
  catalog: CatalogIndex
  sessionId: string
}): DemoRunResult {
  const script = SCRIPTS[input.scenario]
  const field = FieldName.DrugName
  const turn = turnFor(script)
  const normalizedValue = normalizeFieldValue(field, script.proposedValue)
  const reconciliation = reconcileValue({ value: script.proposedValue, turn })
  const verdict = reconciliation.supported
    ? validateField({ field, normalizedValue, catalog: input.catalog })
    : unsupportedValueVerdict({ field, value: script.proposedValue, reconciliation })
  const candidate = makeCandidate({
    candidateId: `${input.sessionId}-${input.scenario}`,
    field,
    rawValue: script.proposedValue,
    normalizedValue,
    provenance: makeProvenance({
      words: turn.words,
      turnOrder: turn.turnOrder,
      transcriptSlice: turn.transcript,
      sessionId: input.sessionId,
    }),
    verdict,
    lasa: lasaRiskFor(script.proposedValue),
    attempt: 1,
  })
  const decision = decide(candidate, policyFor(field))
  return {
    scenario: input.scenario,
    description: script.description,
    spoken: script.spoken,
    proposedValue: script.proposedValue,
    decision,
    reasonCode: decision.reasonCode,
    sayToCaller: decision.agentUtterance,
    writtenToOrder: false,
  }
}
