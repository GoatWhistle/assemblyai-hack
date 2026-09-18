#!/usr/bin/env -S npx tsx

import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const AMOUNTS = ["15", "50", "100", "500"] as const
const UNITS = [
  { spoken: "milligrams", normalised: "mg" },
  { spoken: "micrograms", normalised: "mcg" },
  { spoken: "milliliters", normalised: "mL" },
] as const

type Item = {
  readonly amount: string
  readonly spokenUnit: string
  readonly expected: string
  readonly phrase: string
}

function main(): void {
  const items: Item[] = []
  for (const amount of AMOUNTS) {
    for (const unit of UNITS) {
      items.push({
        amount,
        spokenUnit: unit.spoken,
        expected: `${amount} ${unit.normalised}`,
        phrase: `The strength is ${amount} ${unit.spoken}.`,
      })
    }
  }

  const outDir = "eval/units"
  mkdirSync(outDir, { recursive: true })
  const payload = {
    builtAt: new Date().toISOString(),
    method:
      "every combination of four amounts and three unit classes spoken in a fixed carrier phrase, scored against the same normaliser the product uses",
    purpose:
      "milligrams against micrograms is a thousandfold dose error and it has no published pair list and no checksum, so neither of the product's two strong mechanisms covers it; this measures the class rather than asserting it",
    caveat:
      "Synthetic speech. The rate is a property of the recognizer against a synthesizer, not against a prescriber on a phone.",
    amounts: AMOUNTS,
    units: UNITS.map((unit) => unit.spoken),
    count: items.length,
    items,
  }
  writeFileSync(resolve(outDir, "terms.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8")

  const pairs: string[] = []
  for (const amount of AMOUNTS) {
    pairs.push(`${amount} mg against ${amount} mcg is a factor of 1000`)
  }

  console.log(`unit set: ${items.length} utterances across ${UNITS.length} unit classes`)
  for (const line of pairs) {
    console.log(`  ${line}`)
  }
  console.log(`wrote ${outDir}/terms.json`)
}

main()
