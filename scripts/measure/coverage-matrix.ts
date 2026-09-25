#!/usr/bin/env -S npx tsx

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { loadCatalog, neighbourFor } from "../../src/catalog"
import { FieldName, GateAction, type ReasonCode } from "../../src/domain"
import { makeProvenance } from "../../src/domain/provenance"
import { makeWordSpan } from "../../src/domain/word-span"
import { decide } from "../../src/gate"
import { lasaRiskFor } from "../../src/lasa"
import { validateField } from "../../src/sessions/validate-field"
import { wilson } from "../../src/stats/wilson"
import {
  armFor,
  BRANCH_LABEL,
  BRANCH_ORDER,
  type Branch,
  branchOf,
  reflexYesWrites,
} from "../arms/shipped-policy"
import { printReadBackCost } from "./read-back-cost"

const SETS = ["eval/control/result-plain.json", "eval/native16/result-plain.json"] as const

type Scored = {
  readonly spoken: string
  readonly heard: string
  readonly correct: boolean
  readonly minConfidence: number
  readonly voice: string
}

type ResultFile = { readonly setPath: string; readonly scored: readonly Scored[] }

export type Assignment = {
  readonly setPath: string
  readonly spoken: string
  readonly heard: string
  readonly misheard: boolean
  readonly minConfidence: number
  readonly mechanism: Branch
  readonly withoutPairRule: Branch
  readonly reasonCode: ReasonCode | null
  readonly namesTheTruth: boolean
}

const FIELD = FieldName.DrugName

function assess(entry: Scored, setPath: string): Assignment {
  const catalog = loadCatalog()
  const policy = armFor("shipped").policy
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
  const reason = decision.action === GateAction.Accept ? null : decision.reasonCode
  const neighbour = neighbourFor(catalog, heard)
  const spokenKey = entry.spoken.trim().toLowerCase()
  return {
    setPath,
    spoken: entry.spoken,
    heard,
    misheard: entry.correct === false,
    minConfidence: entry.minConfidence,
    mechanism: branchOf(decision),
    withoutPairRule: branchOf(decide(candidate as never, armFor("without_pair_rule").policy)),
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

function pct(caught: number, total: number): string {
  if (total === 0) {
    return "n/a"
  }
  const interval = wilson(caught, total)
  return `${((caught / total) * 100).toFixed(1)}% [${(interval.low * 100).toFixed(1)}%, ${(interval.high * 100).toFixed(1)}%]`
}

function printTable(rows: readonly Assignment[], pick: (row: Assignment) => Branch): void {
  const errors = rows.filter((r) => r.misheard)
  const correct = rows.filter((r) => !r.misheard)
  console.log("| Mechanism | Errors caught | Asks on correct values |")
  console.log("|---|---|---|")
  for (const branch of BRANCH_ORDER) {
    const caught = errors.filter((r) => pick(r) === branch).length
    const asked = correct.filter((r) => pick(r) === branch).length
    console.log(
      `| ${BRANCH_LABEL[branch]} | ${caught}/${errors.length} | ${asked}/${correct.length} |`,
    )
  }
}

function main(): void {
  const rows = assignments()
  const errors = rows.filter((r) => r.misheard)
  const correct = rows.filter((r) => !r.misheard)
  const on = (branch: Branch) => (r: Assignment) => r.mechanism === branch

  console.log(
    `coverage matrix over ${rows.length} recorded utterances: ${errors.length} recognizer errors, ${correct.length} correct values`,
  )
  console.log(`sets: ${SETS.join(", ")}`)
  console.log("")
  console.log(
    "policy: the shipped drug_name policy, pair rule on and every drug name read back by regulation; each utterance is assigned to the FIRST branch decide() takes: catalogue, then the pair rule, then the confidence threshold, then the standing read-back",
  )
  console.log("")
  printTable(rows, (r) => r.mechanism)

  const asked = correct.filter((r) => r.mechanism !== "accepted").length
  const threshold = correct.filter(on("confidence_threshold")).length
  const standing = correct.filter(on("standing_read_back")).length
  const contrastive = correct.filter(on("pair_rule")).length
  const before = errors.filter((r) => !reflexYesWrites(r.mechanism)).length
  const toEar = errors.filter((r) => reflexYesWrites(r.mechanism) && r.mechanism !== "accepted")
  console.log("")
  console.log(`errors caught before any plain read-back: ${pct(before, errors.length)}`)
  console.log(
    `errors left to a plain read-back and the caller's ear: ${toEar.length}/${errors.length}`,
  )
  console.log(
    `errors written without any question: ${errors.filter(on("accepted")).length}/${errors.length}`,
  )
  console.log(
    `correct drug names the shipped gate asks about: ${asked}/${correct.length}: ${standing} by the standing read-back, ${threshold} by the threshold, ${contrastive} by the pair rule`,
  )
  console.log(
    `correct values asked by the threshold rather than the standing read-back: ${pct(threshold, correct.length)}`,
  )
  console.log(
    `correct values given a contrastive question, the pair rule's cost: ${pct(contrastive, correct.length)}`,
  )

  console.log("")
  console.log("the same corpus without the pair rule, everything else shipped:")
  printTable(rows, (r) => r.withoutPairRule)

  console.log("")
  printReadBackCost(correct.map((r) => r.heard))

  const named = errors.filter((r) => r.namesTheTruth).length
  console.log("")
  console.log(
    `of the ${errors.length} errors, the consonant skeleton names the drug actually spoken in ${named}`,
  )
  const above = errors.filter(
    (r) => r.minConfidence >= armFor("shipped").policy.autoAcceptThreshold,
  )
  console.log(
    `errors at or above the ${armFor("shipped").policy.autoAcceptThreshold} threshold, which a threshold alone accepts: ${above.length}/${errors.length}`,
  )
  for (const row of above) {
    console.log(`  ${row.spoken} heard as ${row.heard} at ${row.minConfidence.toFixed(3)}`)
  }
}

if (process.argv[1]?.includes("coverage-matrix")) {
  main()
}
