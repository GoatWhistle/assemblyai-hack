import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { describeFailure } from "./retry"
import type { ManifestItem, TranscriptResult } from "./transcribe"

export type FailedItem = {
  readonly item: ManifestItem
  readonly error: string
  readonly failedAt: string
}

export type PartialRun = {
  readonly results: readonly TranscriptResult[]
  readonly failed: readonly FailedItem[]
}

const EMPTY_PARTIAL: PartialRun = { results: [], failed: [] }

export function readPartial(path: string): PartialRun {
  if (!existsSync(path)) {
    return EMPTY_PARTIAL
  }
  const raw = readFileSync(path, "utf8")
  const parsed = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw) as {
    results?: unknown
    failed?: unknown
  }
  if (!Array.isArray(parsed.results)) {
    throw new Error(
      `${path} exists but carries no results array; refusing to resume over a file this script did not write`,
    )
  }
  return {
    results: parsed.results as TranscriptResult[],
    failed: Array.isArray(parsed.failed) ? (parsed.failed as FailedItem[]) : [],
  }
}

export function writePartial(path: string, run: PartialRun): void {
  writeFileSync(path, JSON.stringify(run, null, 2), "utf8")
}

export function pendingItems(
  items: readonly ManifestItem[],
  run: PartialRun,
): readonly ManifestItem[] {
  const scored = new Set(run.results.map((result) => result.item.file))
  return items.filter((item) => !scored.has(item.file))
}

export function withResult(run: PartialRun, result: TranscriptResult): PartialRun {
  return {
    results: [...run.results, result],
    failed: run.failed.filter((entry) => entry.item.file !== result.item.file),
  }
}

export function withFailure(run: PartialRun, item: ManifestItem, error: unknown): PartialRun {
  return {
    results: run.results,
    failed: [
      ...run.failed.filter((entry) => entry.item.file !== item.file),
      { item, error: describeFailure(error), failedAt: new Date().toISOString() },
    ],
  }
}

export function inManifestOrder(
  items: readonly ManifestItem[],
  results: readonly TranscriptResult[],
): readonly TranscriptResult[] {
  const order = new Map(items.map((item, index) => [item.file, index]))
  return results
    .filter((result) => order.has(result.item.file))
    .sort((a, b) => (order.get(a.item.file) ?? 0) - (order.get(b.item.file) ?? 0))
}
