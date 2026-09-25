#!/usr/bin/env -S npx tsx

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { LASA_PAIRS } from "@/lasa/pairs"
import { type IsmpPair, pairsFromRows } from "./lasa-pairs"
import { parseIsmp } from "./lasa-parse"
import { sealSnapshot } from "./snapshot"

const ISMP_SOURCE_URL =
  "https://www.ismp.org/system/files/resources/2023-10/ISMP_ConfusedDrugNames_2023.pdf"
const ISMP_SOURCE_TITLE = "ISMP List of Confused Drug Names, updated through February 2023"
const DEFAULT_PDF = "artefacts/sources/ismp-confused-drug-names-2023.pdf"
const OUT_PATH = resolve("data/lasa-pairs.json")
const MIN_PARSED_PAIRS = 40

function pdftotext(): string {
  const bundled = "/mingw64/bin/pdftotext"
  return existsSync(bundled) ? bundled : "pdftotext"
}

function extract(pdfPath: string, mode: "-raw" | "-layout"): string {
  const work = join(tmpdir(), `lasa-${Date.now()}-${mode.slice(1)}`)
  mkdirSync(work, { recursive: true })
  const out = join(work, "list.txt")
  execFileSync(pdftotext(), [mode, pdfPath, out], { stdio: ["ignore", "inherit", "inherit"] })
  return readFileSync(out, "latin1")
}

function keep(reason: string): void {
  console.warn(reason)
  console.warn(`the committed snapshot ${OUT_PATH} is kept unchanged`)
}

function main(): void {
  const pdfPath = process.argv[2] ?? DEFAULT_PDF
  if (!existsSync(pdfPath)) {
    keep(`no ISMP PDF at ${pdfPath}; download ${ISMP_SOURCE_URL} and pass its path to rebuild`)
    return
  }

  const parse = parseIsmp(extract(pdfPath, "-raw"), extract(pdfPath, "-layout"))
  const pairs: readonly IsmpPair[] = pairsFromRows(parse.rows)
  if (pairs.length < MIN_PARSED_PAIRS) {
    keep(
      `parsed only ${pairs.length} pairs, below the ${MIN_PARSED_PAIRS} floor; the parse is not clean`,
    )
    process.exit(1)
    return
  }

  const file = sealSnapshot({
    builtAt: new Date().toISOString(),
    sourceUrl: ISMP_SOURCE_URL,
    source: ISMP_SOURCE_TITLE,
    sourcePdfSha256: createHash("sha256").update(readFileSync(pdfPath)).digest("hex"),
    extraction:
      "pdftotext -raw gives rows in reading order and pdftotext -layout gives cell boundaries; a row that spans several lines is resolved by the list's own symmetry, every pair appearing in both directions",
    rowsParsed: parse.rows.length,
    rowsUnresolved: parse.unresolved.map((group) => ({ page: group.page, lines: group.lines })),
    curated: LASA_PAIRS,
    pairs,
  })

  mkdirSync(resolve("data"), { recursive: true })
  writeFileSync(OUT_PATH, `${JSON.stringify(file, null, 1)}\n`, "utf8")
  console.log(`rows parsed                    ${parse.rows.length}`)
  console.log(`row groups left unresolved     ${parse.unresolved.length}`)
  console.log(`distinct pairs                 ${pairs.length}`)
  console.log(`curated tier                   ${LASA_PAIRS.length}`)
  console.log(`sha256                         ${file.sha256}`)
  console.log(`written                        ${OUT_PATH}`)
}

if (process.argv[1]?.includes("lasa")) {
  main()
}
