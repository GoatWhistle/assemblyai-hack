#!/usr/bin/env -S npx tsx

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import type { LasaPair } from "@/lasa"
import { LASA_PAIRS } from "@/lasa"
import { parseTablePairs } from "./lasa-parse"

const OUT_PATH = resolve("data/lasa-pairs.json")
const MIN_PARSED_PAIRS = 40

function extractFromPdf(pdfPath: string): readonly LasaPair[] {
  const work = join(tmpdir(), `lasa-${Date.now()}`)
  mkdirSync(work, { recursive: true })
  const txt = join(work, "lasa.txt")

  execFileSync("pdftotext", ["-table", pdfPath, txt], {
    stdio: ["ignore", "inherit", "inherit"],
  })

  return parseTablePairs(readFileSync(txt, "utf8"))
}

function write(pairs: readonly LasaPair[], provenance: string): void {
  mkdirSync(resolve("data"), { recursive: true })
  writeFileSync(
    OUT_PATH,
    `${JSON.stringify({ builtAt: new Date().toISOString(), provenance, pairs }, null, 2)}\n`,
    "utf8",
  )
  console.log(`pairs written                  ${pairs.length}`)
  console.log(`provenance                     ${provenance}`)
  console.log(`written                        ${OUT_PATH}`)
}

function main(): void {
  const pdfPath = process.argv[2]

  if (pdfPath === undefined || !existsSync(pdfPath)) {
    console.warn("no ISMP PDF supplied or the path does not exist")
    console.warn("the ISMP list moved to ECRI and is no longer at a stable public PDF URL")
    console.warn(`falling back to the ${LASA_PAIRS.length} curated pairs in src/lasa/pairs.ts`)
    write(LASA_PAIRS, `curated table in src/lasa/pairs.ts (${LASA_PAIRS.length} pairs)`)
    return
  }

  let parsed: readonly LasaPair[] = []
  try {
    parsed = extractFromPdf(pdfPath)
  } catch (error) {
    console.warn(`pdftotext failed: ${String(error)}`)
  }

  if (parsed.length < MIN_PARSED_PAIRS) {
    console.warn(
      `parsed only ${parsed.length} pairs, below the ${MIN_PARSED_PAIRS} floor; the parse is not clean`,
    )
    console.warn(`falling back to the ${LASA_PAIRS.length} curated pairs in src/lasa/pairs.ts`)
    write(LASA_PAIRS, `curated table in src/lasa/pairs.ts (${LASA_PAIRS.length} pairs)`)
    return
  }

  console.log(`parsed from ${pdfPath}`)
  write(parsed, `pdftotext -table over ${pdfPath}, ${parsed.length} pairs`)
}

main()
