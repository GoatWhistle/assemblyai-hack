#!/usr/bin/env -S npx tsx

import { readFileSync } from "node:fs"
import { type CatalogDrug, isCatalogFile } from "../../src/catalog"

const CATALOG_PATH = "data/catalog.json"

export type ScheduleCensus = {
  readonly drugs: number
  readonly scheduled: number
  readonly bySchedule: readonly (readonly [string, number])[]
}

function censusOf(drugs: readonly CatalogDrug[]): ScheduleCensus {
  const counts = new Map<string, number>()
  for (const drug of drugs) {
    if (drug.deaSchedule === null) {
      continue
    }
    counts.set(drug.deaSchedule, (counts.get(drug.deaSchedule) ?? 0) + 1)
  }
  const bySchedule = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
  const scheduled = bySchedule.reduce((sum, [, count]) => sum + count, 0)
  return { drugs: drugs.length, scheduled, bySchedule }
}

function renderCensus(census: ScheduleCensus): string {
  const lines = [
    `controlled-substance census of ${CATALOG_PATH}: ${census.scheduled} of ${census.drugs} drugs carry deaSchedule`,
    `${census.scheduled} drugs, ${census.bySchedule.map(([schedule, count]) => `${schedule} ${count}`).join(", ")}`,
    "",
    "| Schedule | Drugs |",
    "|---|---|",
    ...census.bySchedule.map(([schedule, count]) => `| ${schedule} | ${count} |`),
    "",
    "counted over the built file as it ships; the catalogue is rebuilt from the FDA NDC directory, so the figure moves when make data runs",
  ]
  return `${lines.join("\n")}\n`
}

function main(): void {
  const parsed: unknown = JSON.parse(readFileSync(CATALOG_PATH, "utf8"))
  if (!isCatalogFile(parsed)) {
    process.stderr.write(`${CATALOG_PATH} has no drugs array; rebuild it with make data\n`)
    process.exit(1)
  }
  process.stdout.write(renderCensus(censusOf(parsed.drugs)))
}

if (process.argv[1]?.includes("schedule-census")) {
  main()
}
