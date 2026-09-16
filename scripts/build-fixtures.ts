#!/usr/bin/env -S npx tsx

import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { comboInvalid, happyPath, lasaCatch } from "./fixtures-catalog"
import { checksumFail, lowConfidence, spellOut } from "./fixtures-confidence"
import { echoPhantom, socket3007 } from "./fixtures-transport"

const OUT_DIR = resolve("eval/fixtures")

function main(): void {
  const fixtures = [
    happyPath(),
    lasaCatch(),
    checksumFail(),
    lowConfidence(),
    comboInvalid(),
    spellOut(),
    echoPhantom(),
    socket3007(),
  ]

  mkdirSync(OUT_DIR, { recursive: true })

  for (const item of fixtures) {
    const path = resolve(OUT_DIR, `${item.name}.json`)
    writeFileSync(path, `${JSON.stringify(item, null, 2)}\n`, "utf8")
    const turns = item.frames.filter((f) => f.message.type === "Turn").length
    console.log(`${item.name.padEnd(16)} ${item.frames.length} frames, ${turns} stt turns`)
  }

  console.log("")
  console.log("these fixtures are SYNTHESISED, not recorded from a live run")
  console.log("re-record them before any number in eval/REPORT.md is published")
}

main()
