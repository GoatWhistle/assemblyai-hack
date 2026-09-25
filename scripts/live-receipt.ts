#!/usr/bin/env -S npx tsx

import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import {
  type OrderReceipt,
  type RunKind,
  type RunOutcome,
  type RunRecord,
  ratePerHourFor,
} from "@/domain"
import { appendRunRecord, RUN_REGISTRY } from "./live/run-registry"

export const ACCEPTANCE_BOUNDARIES: readonly string[] = [
  "one call by one member of the team, not a sample of prescribers",
  "provenance is computed in the browser and posted by it; the server did not hear the audio",
  "the recognizer model is the one the browser reported from Begin, not one the server observed",
  "a preview deployment, so cold starts and the free-tier session limit may differ from production",
]

export const LIVE_SMOKE_BOUNDARY =
  "the caller is synthesised speech, prepared lines injected into the page through WebAudio by an automated harness after each agent reply; no human spoke and no microphone was used"

const RECEIPT_KINDS: readonly RunKind[] = ["acceptance_call", "live_smoke", "probe"]

const UNBOUND_PREFIX = "unbound-"

const DEFAULT_COMMAND = "npx tsx scripts/live-receipt.ts"

function boundariesFor(kind: RunKind): readonly string[] {
  if (kind !== "live_smoke") {
    return ACCEPTANCE_BOUNDARIES
  }
  return [LIVE_SMOKE_BOUNDARY, ...ACCEPTANCE_BOUNDARIES.slice(1)]
}

function isUnbound(sessionId: string): boolean {
  return sessionId.startsWith(UNBOUND_PREFIX)
}

export type AcceptanceInput = {
  readonly deployment: string
  readonly sessionId: string
  readonly vendorSessionIds: readonly string[]
  readonly outcome: RunOutcome
  readonly reason: string
  readonly agentSeconds: number
  readonly sttSeconds: number
  readonly receipt: OrderReceipt | null
  readonly recordedAt: string
  readonly kind?: RunKind
}

export function acceptanceArtefact(input: AcceptanceInput) {
  const costUsd =
    (input.agentSeconds / 3600) * ratePerHourFor(["agent"]) +
    (input.sttSeconds / 3600) * ratePerHourFor(["stt", "medical"])
  return {
    recordedAt: input.recordedAt,
    kind: input.kind ?? "acceptance_call",
    deployment: input.deployment,
    sessionId: input.sessionId,
    vendorSessionIds: [...input.vendorSessionIds],
    actualModel: input.receipt?.actualModel ?? null,
    order:
      input.receipt === null
        ? null
        : {
            orderId: input.receipt.orderId,
            receiptSha256: input.receipt.sha256,
            fields: input.receipt.fields.map((field) => ({
              field: field.field,
              value: field.value,
              confirmationMode: field.confirmationMode,
              confirmation: field.confirmation?.verdict ?? null,
            })),
          },
    socketSeconds: { agent: input.agentSeconds, stt: input.sttSeconds },
    costUsd: Math.round(costUsd * 10000) / 10000,
    outcome: input.outcome,
    reason: input.reason,
    boundaries: boundariesFor(input.kind ?? "acceptance_call"),
  }
}

export type ReceiptArgs = {
  readonly deployment: string
  readonly sessionId: string
  readonly outcome: RunOutcome
  readonly reason: string | null
  readonly agentSeconds: number
  readonly sttSeconds: number
  readonly vendorSessionIds: readonly string[]
  readonly kind: RunKind
  readonly command: string
}

const USAGE =
  "usage: npx tsx scripts/live-receipt.ts --deployment <https://preview> --session <id> --outcome completed|failed|inconclusive --reason <text> --agent-seconds <n> --stt-seconds <n> [--vendor-session <id>] [--kind acceptance_call|live_smoke|probe] [--command <text>]"

export function parseReceiptArgs(argv: readonly string[]): ReceiptArgs | string {
  const flag = (name: string): string | null => {
    const index = argv.indexOf(name)
    return index < 0 ? null : (argv[index + 1] ?? null)
  }
  const deployment = flag("--deployment")
  const sessionId = flag("--session")
  const outcome = flag("--outcome")
  if (deployment === null || sessionId === null || outcome === null) {
    return USAGE
  }
  if (!["completed", "failed", "inconclusive"].includes(outcome)) {
    return `--outcome ${outcome} is not one of completed, failed, inconclusive`
  }
  const kind = flag("--kind") ?? "acceptance_call"
  const known = RECEIPT_KINDS.find((entry) => entry === kind)
  if (known === undefined) {
    return `--kind ${kind} is not one of ${RECEIPT_KINDS.join(", ")}`
  }
  const vendor = flag("--vendor-session")
  return {
    deployment,
    sessionId,
    outcome: outcome as RunOutcome,
    reason: flag("--reason"),
    agentSeconds: Number(flag("--agent-seconds") ?? 0),
    sttSeconds: Number(flag("--stt-seconds") ?? 0),
    vendorSessionIds: vendor === null ? [] : [vendor],
    kind: known,
    command: flag("--command") ?? DEFAULT_COMMAND,
  }
}

export type ReceiptDeps = {
  readonly fetch: typeof fetch
  readonly outDir: string
  readonly registry: string
  readonly ledger?: string
  readonly now: () => Date
}

async function fetchReceipt(
  args: ReceiptArgs,
  deps: ReceiptDeps,
): Promise<{ readonly receipt: OrderReceipt | null; readonly note: string | null }> {
  if (isUnbound(args.sessionId)) {
    return { receipt: null, note: null }
  }
  try {
    const response = await deps.fetch(
      `${args.deployment}/api/sessions/${encodeURIComponent(args.sessionId)}/receipt`,
    )
    if (!response.ok) {
      return { receipt: null, note: `the receipt route answered ${response.status}` }
    }
    return {
      receipt: ((await response.json()) as { receipt: OrderReceipt }).receipt,
      note: null,
    }
  } catch (error) {
    return {
      receipt: null,
      note: `the receipt could not be fetched: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function recordReceipt(
  args: ReceiptArgs,
  deps: ReceiptDeps,
): Promise<{ readonly out: string; readonly record: RunRecord }> {
  const unbound = isUnbound(args.sessionId)
  const { receipt, note } = await fetchReceipt(args, deps)
  const given = args.reason ?? (receipt === null ? "no receipt was issued" : "receipt issued")
  const reason = unbound
    ? `the page never bound a server session (${args.sessionId}), so no receipt exists; ${given}`
    : note === null
      ? given
      : `${given}; ${note}`
  const outcome: RunOutcome = unbound ? "failed" : args.outcome
  const recordedAt = deps.now().toISOString()
  const artefact = acceptanceArtefact({
    deployment: args.deployment,
    sessionId: args.sessionId,
    vendorSessionIds: args.vendorSessionIds,
    outcome,
    reason,
    agentSeconds: args.agentSeconds,
    sttSeconds: args.sttSeconds,
    receipt,
    recordedAt,
    kind: args.kind,
  })
  mkdirSync(deps.outDir, { recursive: true })
  const stem = args.kind === "acceptance_call" ? "acceptance" : args.kind.replace(/_/g, "-")
  const out = join(deps.outDir, `${stem}-${recordedAt.replace(/[:.]/g, "-")}.json`)
  writeFileSync(out, `${JSON.stringify(artefact, null, 2)}\n`, "utf8")
  const record = appendRunRecord(
    {
      kind: args.kind,
      command: args.command,
      outcome,
      reason,
      socketSeconds: Math.max(args.agentSeconds, args.sttSeconds),
      sockets: ["agent", "stt", "medical"],
      sessionIds: [args.sessionId, ...args.vendorSessionIds],
      boundaries: artefact.boundaries,
      recordedAt,
    },
    deps.registry,
    deps.ledger,
  )
  return { out, record }
}

async function main(): Promise<void> {
  const args = parseReceiptArgs(process.argv.slice(2))
  if (typeof args === "string") {
    console.error(args)
    process.exit(2)
    return
  }
  const { out, record } = await recordReceipt(args, {
    fetch: (input, init) => fetch(input, init),
    outDir: resolve("eval/live"),
    registry: RUN_REGISTRY,
    now: () => new Date(),
  })
  console.log(
    `written ${out}; ${record.kind} recorded as ${record.outcome} in ${RUN_REGISTRY}; ledger eval/spend-ledger.json`,
  )
}

if (process.argv[1]?.includes("live-receipt")) {
  void main()
}
