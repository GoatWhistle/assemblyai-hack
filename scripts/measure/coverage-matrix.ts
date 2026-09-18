#!/usr/bin/env -S npx tsx

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { loadCatalog, neighbourFor } from "../../src/catalog"
import { FieldName, GateAction, ReasonCode } from "../../src/domain"
import { policyFor } from "../../src/domain/policy"
import { makeProvenance } from "../../src/domain/provenance"
import { makeWordSpan } from "../../src/domain/word-span"
import { decide } from "../../src/gate"
import { lasaRiskFor } from "../../src/lasa"
import { validateField } from "../../src/sessions/validate-field"
import { wilson } from "../../src/stats/wilson"

const SETS = ["eval/control/result-plain.json", "eval/native16/result-plain.json"] as const

type Scored = {
  readonly spoken: string
  readonly heard: string
  readonly correct: boolean
  readonly minConfidence: number
  readonly voice: string
}

type ResultFile = { readonly setPath: string; readonly scored: readonly Scored[] }

type Mechanism = "catalogue_absence" | "lasa_pair" | "confidence_threshold" | "nothing"

export type Assignment = {
  readonly setPath: string
  readonly spoken: string
  readonly heard: string
  readonly misheard: boolean
  readonly minConfidence: number
  readonly mechanism: Mechanism
  readonly reasonCode: ReasonCode | null
  readonly namesTheTruth: boolean
}

const FIELD = FieldName.DrugName

function mechanismFor(reason: ReasonCode | null): Mechanism {
  if (reason === ReasonCode.ValidatorCatalog) {
    return "catalogue_absence"
  }
  if (reason === ReasonCode.LasaHit) {
    return "lasa_pair"
  }
  if (reason === ReasonCode.LowConfidence || reason === ReasonCode.SpellOutAfterSecondFailure) {
    return "confidence_threshold"
  }
  return "nothing"
}

function assess(entry: Scored, setPath: string): Assignment {
  const catalog = loadCatalog()
  const policy = policyFor(FIELD)
  const heard = entry.heard
  const verdict = validateField({
    field: FIELD,
    normalizedValue: heard,
    catalog,
  })
  const candidate = {
    candidateId: `${setPath}:${entry.spoken}`,
    field: FIELD,
    rawValue: heard,
    normalizedValue: heard,
    provenance: makeProvenance({
      words: [
        makeWordSpan({
          text: heard,
          startMs: 1000,
          endMs: 1600,
          confidence: entry.minConfidence,
        }),
      ],
      turnOrder: 1,
      transcriptSlice: heard,
      sessionId: `${setPath}:${entry.spoken}`,
    }),
    verdict,
    lasa: lasaRiskFor(heard),
    attempt: 1,
  }
  const decision = decide(candidate as never, policy)
  const asked = decision.action !== GateAction.Accept
  const reason = asked ? decision.reasonCode : null
  const neighbour = neighbourFor(catalog, heard)
  const spokenKey = entry.spoken.trim().toLowerCase()
  return {
    setPath,
    spoken: entry.spoken,
    heard,
    misheard: entry.correct === false,
    minConfidence: entry.minConfidence,
    mechanism: mechanismFor(reason),
    reasonCode: reason,
    namesTheTruth:
      neighbour?.candidates.some((name) => name.trim().toLowerCase() === spokenKey) ?? false,
  }
}

export function assignments(): readonly Assignment[] {
  const out: Assignment[] = []
  for (const path of SETS) {
    const file = JSON.parse(readFileSync(resolve(path), "utf8")) as ResultFile
    for (const entry of file.scored) {
      out.push(assess(entry, path))
    }
  }
  return out
}

const ORDER: readonly Mechanism[] = [
  "catalogue_absence",
  "lasa_pair",
  "confidence_threshold",
  "nothing",
]

const LABEL: Readonly<Record<Mechanism, string>> = Object.freeze({
  catalogue_absence: "catalogue absence",
  lasa_pair: "LASA pair membership",
  confidence_threshold: "confidence below threshold",
  nothing: "nothing fired, value accepted",
})

function pct(caught: number, total: number): string {
  if (total === 0) {
    return "n/a"
  }
  const interval = wilson(caught, total)
  return `${((caught / total) * 100).toFixed(1)}% [${(interval.low * 100).toFixed(1)}%, ${(interval.high * 100).toFixed(1)}%]`
}

function main(): void {
  const rows = assignments()
  const errors = rows.filter((r) => r.misheard)
  const correct = rows.filter((r) => !r.misheard)

  console.log(
    `coverage matrix over ${rows.length} recorded utterances: ${errors.length} recognizer errors, ${correct.length} correct values`,
  )
  console.log(`sets: ${SETS.join(", ")}`)
  console.log("")
  console.log(
    "each utterance is assigned to the FIRST mechanism that fires in the gate's own branch order, which is the order decide() evaluates: catalogue, then LASA, then the confidence threshold",
  )
  console.log("")
  console.log("| Mechanism | Errors caught | False asks on correct values |")
  console.log("|---|---|---|")
  for (const mechanism of ORDER) {
    const caught = errors.filter((r) => r.mechanism === mechanism).length
    const falseAsks = correct.filter((r) => r.mechanism === mechanism).length
    console.log(
      `| ${LABEL[mechanism]} | ${caught}/${errors.length} | ${falseAsks}/${correct.length} |`,
    )
  }

  const caughtTotal = errors.filter((r) => r.mechanism !== "nothing").length
  const askedTotal = correct.filter((r) => r.mechanism !== "nothing").length
  console.log("")
  console.log(`errors caught by at least one mechanism: ${pct(caughtTotal, errors.length)}`)
  console.log(`correct values re-asked: ${pct(askedTotal, correct.length)}`)

  const named = errors.filter((r) => r.namesTheTruth).length
  console.log("")
  console.log(
    `of the ${errors.length} errors, the consonant skeleton names the drug actually spoken in ${named}`,
  )

  const missed = errors.filter((r) => r.mechanism === "nothing")
  if (missed.length > 0) {
    console.log("")
    console.log("errors nothing caught:")
    for (const row of missed) {
      console.log(`  ${row.spoken} heard as ${row.heard} at ${row.minConfidence.toFixed(3)}`)
    }
  }
}

if (process.argv[1]?.includes("coverage-matrix")) {
  main()
}
