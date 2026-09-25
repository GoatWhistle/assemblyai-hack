#!/usr/bin/env -S npx tsx

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { LiveManifest } from "../build/live-set"
import type { LiveResultFile } from "../live/live-analysis"
import {
  LIVE_HINTED_RESULT,
  LIVE_MANIFEST_PATH,
  LIVE_PLAIN_RESULT,
  liveReport,
} from "../report/live-report"

function readJson<T>(path: string): T | null {
  return existsSync(resolve(path))
    ? (JSON.parse(readFileSync(resolve(path), "utf8")) as T)
    : null
}

const report = liveReport(
  readJson<LiveManifest>(LIVE_MANIFEST_PATH),
  readJson<LiveResultFile>(LIVE_PLAIN_RESULT),
  readJson<LiveResultFile>(LIVE_HINTED_RESULT),
)
console.log(
  report
    .split("\n")
    .filter((line) => line.startsWith("keyterms ablation"))
    .join("\n"),
)
console.log(
  "the hinted arm puts LASA drug names into keyterms_prompt for this measurement only; the product never sends them, and make keyterms-purity keeps it that way",
)
