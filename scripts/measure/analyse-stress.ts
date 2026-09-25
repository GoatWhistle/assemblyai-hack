#!/usr/bin/env -S npx tsx

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { FieldName } from "../../src/domain"
import { policyFor } from "../../src/domain/policy"
import { lasaRiskFor, normalizeDrugName } from "../../src/lasa"
import { wilson } from "../../src/stats/wilson"
import { type Scored, score } from "../eer/score"
import type { TranscriptResult } from "../eer/transcribe"

const STRESS_RESULT = "eval/stress/result-plain.json"
const CLEAN = ["eval/dev/result-plain.json", "eval/control/result-plain.json"] as const

type Row = Scored & { readonly condition: string }

export type Tally = {
  readonly n: number
  readonly errors: number
  readonly confidentErrors: number
  readonly partnerSubstitutions: number
  readonly confidentPartnerSubstitutions: readonly Row[]
}

const THRESHOLD = policyFor(FieldName.DrugName).autoAcceptThreshold

const NORMAL_CLOSE = 1000

function transportFailed(row: Scored): boolean {
  return row.closeCode !== NORMAL_CLOSE
}

export function isPartnerSubstitution(row: Scored): boolean {
  const heard = normalizeDrugName(row.heard)
  return !row.correct && lasaRiskFor(row.spoken).confusableWith.includes(heard)
}

export function tally(rows: readonly Row[]): Tally {
  const errors = rows.filter((row) => !row.correct)
  const partner = errors.filter(isPartnerSubstitution)
  return {
    n: rows.length,
    errors: errors.length,
    confidentErrors: errors.filter((row) => row.minConfidence >= THRESHOLD).length,
    partnerSubstitutions: partner.length,
    confidentPartnerSubstitutions: partner.filter((row) => row.minConfidence >= THRESHOLD),
  }
}

type ResultFile = {
  readonly results?: readonly (TranscriptResult & {
    readonly item: { readonly condition?: string }
  })[]
  readonly scored?: readonly Scored[]
  readonly failed?: readonly unknown[]
}

function rowsOf(path: string, condition: string | null): readonly Row[] {
  const file = JSON.parse(readFileSync(resolve(path), "utf8")) as ResultFile
  const results = file.results
  const scored = results === undefined ? (file.scored ?? []) : score(results)
  return scored
    .map((entry, index) => ({
      ...entry,
      condition: condition ?? String(results?.[index]?.item.condition ?? ""),
    }))
    .filter((row) => lasaRiskFor(row.spoken).hit)
}

function pct(part: number, total: number): string {
  if (total === 0) {
    return "n/a"
  }
  const interval = wilson(part, total)
  return `${((part / total) * 100).toFixed(1)}% [${(interval.low * 100).toFixed(1)}%, ${(interval.high * 100).toFixed(1)}%]`
}

function line(label: string, t: Tally): string {
  return `| ${label} | ${t.n} | ${t.errors} (${pct(t.errors, t.n)}) | ${t.confidentErrors} | ${t.partnerSubstitutions} | ${t.confidentPartnerSubstitutions.length} (${pct(t.confidentPartnerSubstitutions.length, t.n)}) |`
}

function main(): void {
  const path = process.argv[2] ?? STRESS_RESULT
  if (!existsSync(path)) {
    console.log(`stress set: not measured (${path} does not exist)`)
    return
  }
  const everything = rowsOf(path, null)
  const excluded = everything.filter(transportFailed)
  const stress = everything.filter((row) => !transportFailed(row))
  const clean = CLEAN.flatMap((file) => rowsOf(file, "clean")).filter(
    (row) => !transportFailed(row),
  )
  const conditions = [...new Set(stress.map((row) => row.condition))]

  console.log(
    `stress set over ${path}: ${everything.length} utterances whose spoken name is on the full ISMP list, ${stress.length} scored`,
  )
  console.log(
    `sessions that closed with a code other than ${NORMAL_CLOSE}, excluded rather than scored as mishearings: ${excluded.length}`,
  )
  for (const row of excluded) {
    console.log(
      `  ${row.condition}: ${row.spoken} closed ${row.closeCode} after ${row.socketMs} ms`,
    )
  }
  const failed = (JSON.parse(readFileSync(resolve(path), "utf8")) as ResultFile).failed ?? []
  console.log(
    `items that failed after transport retries and appear in no row: ${failed.length}`,
  )
  console.log(
    `a confident partner substitution is a misheard value that is a published partner of the spoken name at minimum word confidence ${THRESHOLD} or above`,
  )
  console.log("")
  console.log(
    "| Condition | N | Errors, 95% Wilson | Errors at or above threshold | Heard as a listed partner | Confident partner substitutions, 95% Wilson |",
  )
  console.log("|---|---|---|---|---|---|")
  console.log(line("clean, as recorded on 16 September", tally(clean)))
  for (const condition of conditions) {
    console.log(line(condition, tally(stress.filter((row) => row.condition === condition))))
  }
  const all = tally(stress)
  console.log(line("all degraded conditions", all))
  console.log("")
  console.log(
    `confident substitutions to a published partner under degradation: ${all.confidentPartnerSubstitutions.length} of ${all.n}, ${pct(all.confidentPartnerSubstitutions.length, all.n)}`,
  )
  for (const row of all.confidentPartnerSubstitutions) {
    console.log(
      `  ${row.condition}: ${row.spoken} heard as ${row.heard} at ${row.minConfidence.toFixed(3)}`,
    )
  }
  const partnerAny = stress.filter(isPartnerSubstitution)
  for (const row of partnerAny.filter((r) => r.minConfidence < THRESHOLD)) {
    console.log(
      `  below threshold, ${row.condition}: ${row.spoken} heard as ${row.heard} at ${row.minConfidence.toFixed(3)}`,
    )
  }
}

if (process.argv[1]?.includes("analyse-stress")) {
  main()
}
