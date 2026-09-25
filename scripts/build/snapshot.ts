import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { canonicalJson } from "@/domain"

export type SnapshotStamp = {
  readonly builtAt: string
  readonly sourceUrl: string
  readonly sha256: string
}

export type SnapshotVerdict =
  | { readonly status: "valid"; readonly stamp: SnapshotStamp }
  | {
      readonly status: "missing" | "unreadable" | "unsealed" | "mismatch"
      readonly detail: string
    }

export const DATA_SNAPSHOTS: readonly string[] = ["data/catalog.json", "data/lasa-pairs.json"]

function withoutDigest(file: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const { sha256: _digest, ...rest } = file
  return rest
}

function snapshotDigest(file: Readonly<Record<string, unknown>>): string {
  return createHash("sha256")
    .update(canonicalJson(withoutDigest(file)), "utf8")
    .digest("hex")
}

export function sealSnapshot<
  T extends { readonly builtAt: string; readonly sourceUrl: string },
>(file: T): T & { readonly sha256: string } {
  const unsealed = withoutDigest(file) as T
  return { ...unsealed, sha256: snapshotDigest(unsealed) }
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function snapshotVerdictOf(raw: string): SnapshotVerdict {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { status: "unreadable", detail: "the snapshot is not valid JSON" }
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { status: "unreadable", detail: "the snapshot is not a JSON object" }
  }
  const file = parsed as Record<string, unknown>
  if (!nonEmpty(file.builtAt) || !nonEmpty(file.sourceUrl) || !nonEmpty(file.sha256)) {
    return {
      status: "unsealed",
      detail: "the snapshot lacks builtAt, sourceUrl or sha256; rebuild it with make data",
    }
  }
  const expected = snapshotDigest(file)
  if (expected !== file.sha256) {
    return {
      status: "mismatch",
      detail: `recorded sha256 ${file.sha256} but the content hashes to ${expected}; the file was edited after it was built`,
    }
  }
  return {
    status: "valid",
    stamp: { builtAt: file.builtAt, sourceUrl: file.sourceUrl, sha256: file.sha256 },
  }
}

export function snapshotVerdict(path: string): SnapshotVerdict {
  const absolute = resolve(path)
  if (!existsSync(absolute)) {
    return {
      status: "missing",
      detail: `${path} is absent; it is a committed snapshot, so restore it rather than rebuilding it silently`,
    }
  }
  return snapshotVerdictOf(readFileSync(absolute, "utf8"))
}
