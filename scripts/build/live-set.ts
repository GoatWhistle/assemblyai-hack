#!/usr/bin/env -S npx tsx

import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { type LiveSetItem, parseVoiceSet, VOICE_SET_DOC } from "../live/voice-set"

const LIVE_MANIFEST = "eval/live/manifest.json"

const EXPECTED_ITEMS = 75

export type LiveManifestItem = LiveSetItem & {
  readonly present: boolean
  readonly sha256: string | null
}

export type LiveManifest = {
  readonly builtAt: string
  readonly source: string
  readonly method: string
  readonly count: number
  readonly present: number
  readonly items: readonly LiveManifestItem[]
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

export function buildLiveManifest(markdown: string, builtAt: string): LiveManifest {
  const items = parseVoiceSet(markdown).map((item) => {
    const present = existsSync(resolve(item.file))
    return { ...item, present, sha256: present ? digest(resolve(item.file)) : null }
  })
  return {
    builtAt,
    source: VOICE_SET_DOC,
    method:
      "three team members read docs/voice-set.md once each into 16 kHz mono PCM16 WAV; the sha256 of each file is recorded so a later run can prove it used the same audio",
    count: items.length,
    present: items.filter((item) => item.present).length,
    items,
  }
}

function main(): void {
  const manifest = buildLiveManifest(
    readFileSync(resolve(VOICE_SET_DOC), "utf8"),
    new Date().toISOString(),
  )
  mkdirSync(resolve("eval/live"), { recursive: true })
  writeFileSync(resolve(LIVE_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
  console.log(
    `items parsed from ${VOICE_SET_DOC}   ${manifest.count} (expected ${EXPECTED_ITEMS})`,
  )
  console.log(`audio files present          ${manifest.present} of ${manifest.count}`)
  for (const kind of ["lasa", "safe", "npi", "dea", "readback-answer", "non-command"]) {
    console.log(
      `  ${kind.padEnd(16)} ${manifest.items.filter((item) => item.kind === kind).length}`,
    )
  }
  console.log(`written                      ${LIVE_MANIFEST}`)
  if (manifest.count !== EXPECTED_ITEMS) {
    console.error(
      `the script parsed ${manifest.count} lines, not ${EXPECTED_ITEMS}; the table changed shape`,
    )
    process.exit(1)
  }
}

if (process.argv[1]?.includes("live-set")) {
  main()
}
