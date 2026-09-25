import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { type RunRecord, ratePerHourFor, type SocketKind } from "@/domain"
import { appendPaidRun, paidRunOf } from "../report/record-spend"

export const RUN_REGISTRY = "eval/live/runs.json"

type Registry = { readonly rule?: string; readonly runs: readonly RunRecord[] }

const OUTCOMES: readonly string[] = ["completed", "failed", "inconclusive"]

const KINDS: readonly string[] = [
  "acceptance_call",
  "eval_live",
  "recorded_session",
  "probe",
  "live_smoke",
]

export function isRunRecord(value: unknown): value is RunRecord {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const run = value as Partial<RunRecord>
  return (
    typeof run.runId === "string" &&
    typeof run.recordedAt === "string" &&
    typeof run.command === "string" &&
    KINDS.includes(String(run.kind)) &&
    typeof run.reason === "string" &&
    Array.isArray(run.sessionIds) &&
    run.sessionIds.every((id) => typeof id === "string") &&
    OUTCOMES.includes(String(run.outcome)) &&
    typeof run.socketSeconds === "number" &&
    typeof run.costUsd === "number" &&
    Array.isArray(run.boundaries) &&
    run.boundaries.length > 0
  )
}

export function readRegistry(path = RUN_REGISTRY): Registry {
  if (!existsSync(resolve(path))) {
    return { runs: [] }
  }
  const raw = JSON.parse(readFileSync(resolve(path), "utf8")) as {
    rule?: string
    runs?: unknown
  }
  const runs = Array.isArray(raw.runs) ? raw.runs : []
  if (!runs.every(isRunRecord)) {
    throw new Error(`${path} holds an entry that is not a RunRecord; refusing to rewrite it`)
  }
  return { rule: raw.rule, runs }
}

export function runRecordOf(input: {
  kind: RunRecord["kind"]
  command: string
  outcome: RunRecord["outcome"]
  reason: string
  socketSeconds: number
  sockets: readonly SocketKind[]
  sessionIds: readonly string[]
  boundaries: readonly string[]
  recordedAt?: string
}): RunRecord {
  if (input.boundaries.length === 0) {
    throw new Error("a run record must name at least one thing the run did not verify")
  }
  const recordedAt = input.recordedAt ?? new Date().toISOString()
  const cost = (input.socketSeconds / 3600) * ratePerHourFor(input.sockets)
  return {
    runId: `${input.kind}-${recordedAt}`,
    recordedAt,
    kind: input.kind,
    command: input.command,
    outcome: input.outcome,
    reason: input.reason,
    socketSeconds: Math.round(input.socketSeconds * 1000) / 1000,
    costUsd: Math.round(cost * 10000) / 10000,
    sessionIds: [...input.sessionIds],
    boundaries: [...input.boundaries],
  }
}

export function appendRunRecord(
  input: Parameters<typeof runRecordOf>[0],
  path = RUN_REGISTRY,
  ledger?: string,
): RunRecord {
  const record = runRecordOf(input)
  const registry = readRegistry(path)
  if (registry.runs.some((run) => run.runId === record.runId)) {
    throw new Error(`run ${record.runId} is already recorded`)
  }
  writeFileSync(
    resolve(path),
    `${JSON.stringify({ ...registry, runs: [...registry.runs, record] }, null, 2)}\n`,
    "utf8",
  )
  const closedAtMs = Date.parse(record.recordedAt)
  appendPaidRun(
    paidRunOf({
      command: record.command,
      sockets: input.sockets,
      openedAtMs: closedAtMs - record.socketSeconds * 1000,
      closedAtMs,
      outcome: record.outcome === "completed" ? "completed" : "failed",
    }),
    ledger,
  )
  return record
}
