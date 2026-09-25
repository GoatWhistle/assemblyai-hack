#!/usr/bin/env -S npx tsx

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { lasaCheckedTerms } from "@/lasa"
import type { LiveManifest } from "../build/live-set"
import { transcribeItem } from "../eer/transcribe"
import type { LiveResult, LiveResultFile } from "../live/live-analysis"
import { appendRunRecord } from "../live/run-registry"
import {
  LIVE_HINTED_RESULT,
  LIVE_MANIFEST_PATH,
  LIVE_PLAIN_RESULT,
} from "../report/live-report"

export const PAID_CONFIRMATION_FLAG = "--confirm-paid"

const SPACING_MS = Number(process.env.EER_SPACING_MS ?? 24000)

export function refusalReason(input: {
  argv: readonly string[]
  key: string | undefined
  manifest: LiveManifest | null
  outPath: string
  outExists: boolean
}): string | null {
  if (!input.argv.includes(PAID_CONFIRMATION_FLAG)) {
    return `this opens one paid streaming socket per audio file; rerun with ${PAID_CONFIRMATION_FLAG} once a human has approved the spend`
  }
  if (input.key === undefined || input.key.trim().length === 0) {
    return "ASSEMBLYAI_API_KEY is not set, so no figure can be measured"
  }
  if (input.manifest === null) {
    return `${LIVE_MANIFEST_PATH} does not exist; run npx tsx scripts/build/live-set.ts first`
  }
  if (input.manifest.present === 0) {
    return "no audio file of the human voice set is present, so a rate over nothing is refused"
  }
  if (input.outExists) {
    return `${input.outPath} already holds a recorded run and is never overwritten`
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms))
}

async function main(): Promise<void> {
  const hinted = process.argv.includes("--lasa-keyterms")
  const outPath = hinted ? LIVE_HINTED_RESULT : LIVE_PLAIN_RESULT
  const manifest = existsSync(resolve(LIVE_MANIFEST_PATH))
    ? (JSON.parse(readFileSync(resolve(LIVE_MANIFEST_PATH), "utf8")) as LiveManifest)
    : null
  const refusal = refusalReason({
    argv: process.argv,
    key: process.env.ASSEMBLYAI_API_KEY,
    manifest,
    outPath,
    outExists: existsSync(resolve(outPath)),
  })
  if (refusal !== null || manifest === null) {
    console.error(refusal)
    process.exit(1)
    return
  }
  const key = String(process.env.ASSEMBLYAI_API_KEY)
  const keyterms = hinted ? [...lasaCheckedTerms()] : []
  const items = manifest.items.filter((item) => item.present)
  const openedAt = Date.now()
  const results: LiveResult[] = []
  let socketMs = 0
  for (const [index, item] of items.entries()) {
    const result = await transcribeItem(
      {
        file: item.file,
        spoken: item.text,
        carrier: item.text,
        voice: item.speaker,
        entityType: item.kind,
      },
      key,
      keyterms,
    )
    socketMs += result.socketMs
    results.push({
      id: item.id,
      transcript: result.transcript,
      words: result.words,
      closeCode: result.closeCode,
    })
    console.log(
      `  ${index + 1}/${items.length} ${item.id} -> ${result.transcript || "(empty)"}`,
    )
    if (index < items.length - 1) {
      await sleep(SPACING_MS)
    }
  }
  const file: LiveResultFile = {
    measuredAt: new Date(openedAt).toISOString(),
    keyterms: hinted ? "lasa-names" : "none",
    results,
  }
  writeFileSync(resolve(outPath), `${JSON.stringify(file, null, 2)}\n`, "utf8")
  appendRunRecord({
    kind: "eval_live",
    command: `npx tsx scripts/measure/measure-live.ts ${PAID_CONFIRMATION_FLAG}${hinted ? " --lasa-keyterms" : ""}`,
    outcome: results.every((r) => r.closeCode === 1000) ? "completed" : "inconclusive",
    reason: `${results.length} of ${items.length} files transcribed`,
    socketSeconds: socketMs / 1000,
    sockets: ["stt"],
    sessionIds: [],
    boundaries: [
      "one read per speaker, three speakers",
      "no agent socket, so no read-back is played back to the speaker",
      "the recognizer socket only; the gate is applied offline to the transcripts",
    ],
  })
  console.log(`raw results: ${outPath}`)
}

if (process.argv[1]?.includes("measure-live")) {
  void main()
}
