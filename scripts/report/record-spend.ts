import { readFileSync, writeFileSync } from "node:fs"
import { type PaidRun, parseLedger, type SocketKind } from "@/domain"

const LEDGER_PATH = "eval/spend-ledger.json"

export function appendPaidRun(run: PaidRun, path: string = LEDGER_PATH): readonly PaidRun[] {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"))
  const existing = parseLedger(raw)
  if (existing === null) {
    throw new Error(
      `${path} does not parse as a ledger of paid runs; refusing to append and silently rewrite it`,
    )
  }
  if (existing.some((entry) => entry.runId === run.runId)) {
    throw new Error(
      `a run with id ${run.runId} is already recorded; a duplicate id would let one paid run be counted twice or hide a second one`,
    )
  }
  const runs = [...existing, run]
  const next = { ...(raw as Record<string, unknown>), runs }
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, "utf8")
  return runs
}

export function paidRunOf(input: {
  command: string
  sockets: readonly SocketKind[]
  openedAtMs: number
  closedAtMs: number
  outcome: PaidRun["outcome"]
  nowIso?: string
}): PaidRun {
  const at = input.nowIso ?? new Date(input.closedAtMs).toISOString()
  const openSeconds = Math.max(0, (input.closedAtMs - input.openedAtMs) / 1000)
  return {
    runId: `${input.command.replace(/[^a-z0-9]+/gi, "-")}-${at}`,
    at,
    command: input.command,
    sockets: input.sockets,
    openSeconds: Math.round(openSeconds * 1000) / 1000,
    outcome: input.outcome,
  }
}
