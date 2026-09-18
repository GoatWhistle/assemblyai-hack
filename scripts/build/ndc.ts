#!/usr/bin/env -S npx tsx

import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import type { CatalogFile } from "@/catalog"
import { buildDrugs, parseTsv } from "./ndc-parse"

const SOURCE_URL = "https://www.accessdata.fda.gov/cder/ndctext.zip"
const OUT_PATH = resolve("data/catalog.json")

function fetchAndExtract(): string {
  const work = join(tmpdir(), `ndc-${Date.now()}`)
  mkdirSync(work, { recursive: true })
  const zip = join(work, "ndctext.zip")

  console.log(`downloading ${SOURCE_URL}`)
  execFileSync("curl", ["-sS", "-L", "--fail", "--max-time", "180", "-o", zip, SOURCE_URL], {
    stdio: ["ignore", "inherit", "inherit"],
  })
  execFileSync("unzip", ["-o", "-q", zip, "product.txt", "-d", work], {
    stdio: ["ignore", "inherit", "inherit"],
  })

  return join(work, "product.txt")
}

function readLatin1(path: string): string {
  return readFileSync(path).toString("latin1")
}

function main(): void {
  const localOverride = process.argv[2]
  let productPath: string

  if (localOverride !== undefined) {
    console.log(`using local product.txt at ${localOverride}`)
    productPath = localOverride
  } else {
    try {
      productPath = fetchAndExtract()
    } catch (error) {
      console.error(`could not fetch ${SOURCE_URL}: ${String(error)}`)
      console.error("pass a local product.txt path as the first argument to build offline")
      process.exit(1)
      return
    }
  }

  const rows = parseTsv(readLatin1(productPath))
  if (rows.length === 0) {
    console.error("product.txt parsed to zero rows; the layout changed or the file is empty")
    process.exit(1)
    return
  }

  const { drugs, stats } = buildDrugs(rows)

  const file: CatalogFile = {
    builtAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    rowsRead: stats.rowsRead,
    rowsAfterPrescriptionFilter: stats.rowsAfterPrescriptionFilter,
    rowsAfterDedup: stats.rowsAfterDedup,
    drugs,
  }

  mkdirSync(resolve("data"), { recursive: true })
  writeFileSync(OUT_PATH, `${JSON.stringify(file)}\n`, "utf8")

  const dropped = stats.rowsAfterPrescriptionFilter - stats.rowsAfterDedup
  const dedupShare =
    stats.rowsAfterPrescriptionFilter === 0
      ? 0
      : (100 * dropped) / stats.rowsAfterPrescriptionFilter

  console.log(`rows read                      ${stats.rowsRead}`)
  for (const [type, count] of Object.entries(stats.productTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(28)} ${count}`)
  }
  console.log(`after prescription filter      ${stats.rowsAfterPrescriptionFilter}`)
  console.log(`after dedup by name+combo      ${stats.rowsAfterDedup}`)
  console.log(`dedup removed                  ${dropped} rows (${dedupShare.toFixed(1)}%)`)
  console.log(`distinct drug names            ${drugs.length}`)
  console.log(`written                        ${OUT_PATH}`)
}

main()
