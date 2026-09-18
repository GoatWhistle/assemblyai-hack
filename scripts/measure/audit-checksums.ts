#!/usr/bin/env -S npx tsx

import { VerdictOutcome } from "../../src/domain"
import { validateDea, validateNpi } from "../../src/validators"

const SAMPLE = Number(process.argv[2] ?? 200)

const deaOk = (value: string) => validateDea(value).outcome === VerdictOutcome.Passed
const npiOk = (value: string) => validateNpi(value).outcome === VerdictOutcome.Passed

function validDea(limit: number): readonly string[] {
  const out: string[] = []
  for (let n = 0; n < 10_000_000 && out.length < limit; n += 1) {
    const candidate = `AB${String(n).padStart(7, "0")}`
    if (deaOk(candidate)) {
      out.push(candidate)
    }
  }
  return out
}

function validNpi(limit: number): readonly string[] {
  const out: string[] = []
  for (let n = 1_000_000_000; n < 1_000_200_000 && out.length < limit; n += 1) {
    const candidate = String(n)
    if (npiOk(candidate)) {
      out.push(candidate)
    }
  }
  return out
}

export type ChecksumCoverage = {
  readonly label: string
  readonly identifiers: number
  readonly substitutionsCaught: number
  readonly substitutionsTotal: number
  readonly transpositionsCaught: number
  readonly transpositionsTotal: number
}

function sweep(
  label: string,
  values: readonly string[],
  ok: (value: string) => boolean,
  digitsFrom: number,
): ChecksumCoverage {
  let substitutionsCaught = 0
  let substitutionsTotal = 0
  let transpositionsCaught = 0
  let transpositionsTotal = 0

  for (const value of values) {
    for (let i = digitsFrom; i < value.length; i += 1) {
      for (let digit = 0; digit <= 9; digit += 1) {
        if (String(digit) === value[i]) {
          continue
        }
        substitutionsTotal += 1
        if (!ok(`${value.slice(0, i)}${digit}${value.slice(i + 1)}`)) {
          substitutionsCaught += 1
        }
      }
    }
    for (let i = digitsFrom; i < value.length - 1; i += 1) {
      const a = value[i]
      const b = value[i + 1]
      if (a === b) {
        continue
      }
      transpositionsTotal += 1
      if (!ok(`${value.slice(0, i)}${b}${a}${value.slice(i + 2)}`)) {
        transpositionsCaught += 1
      }
    }
  }

  return {
    label,
    identifiers: values.length,
    substitutionsCaught,
    substitutionsTotal,
    transpositionsCaught,
    transpositionsTotal,
  }
}

function percent(caught: number, total: number): string {
  return total === 0 ? "n/a" : `${((caught / total) * 100).toFixed(1)}%`
}

export function coverage(sample: number): readonly ChecksumCoverage[] {
  return [
    sweep("NPI, Luhn over 80840 plus nine digits", validNpi(sample), npiOk, 0),
    sweep("DEA, mod-10 over seven digits", validDea(sample), deaOk, 2),
  ]
}

function main(): void {
  const rows = coverage(SAMPLE)
  console.log(`checksum coverage, exhaustive over ${SAMPLE} valid identifiers of each kind`)
  console.log("")
  console.log(
    "| Identifier | Valid samples | Single-digit substitutions | Adjacent transpositions |",
  )
  console.log("|---|---|---|---|")
  for (const row of rows) {
    console.log(
      `| ${row.label} | ${row.identifiers} | ${row.substitutionsCaught}/${row.substitutionsTotal} = **${percent(row.substitutionsCaught, row.substitutionsTotal)}** | ${row.transpositionsCaught}/${row.transpositionsTotal} = **${percent(row.transpositionsCaught, row.transpositionsTotal)}** |`,
    )
  }
  console.log("")
  console.log(
    "every mutation of every sampled identifier was tried, so these are exact coverage figures rather than estimates",
  )
}

if (process.argv[1]?.includes("audit-checksums")) {
  main()
}
