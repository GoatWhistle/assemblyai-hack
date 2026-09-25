import { execFileSync } from "node:child_process"
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { parseLedger } from "@/domain"
import { appendRunRecord, isRunRecord, readRegistry } from "../../scripts/live/run-registry"
import { reconcileRegistry, reconciles } from "../../scripts/report/spend-reconcile"

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function scratch(): { registry: string; ledger: string } {
  const dir = mkdtempSync(join(tmpdir(), "readback-spend-"))
  dirs.push(dir)
  const registry = join(dir, "runs.json")
  const ledger = join(dir, "ledger.json")
  writeFileSync(registry, JSON.stringify({ runs: [] }), "utf8")
  copyFileSync("eval/spend-ledger.json", ledger)
  return { registry, ledger }
}

function record(at: string, socketSeconds = 120) {
  return {
    kind: "acceptance_call" as const,
    command: "npx tsx scripts/live-receipt.ts",
    outcome: "completed" as const,
    reason: "one call placed an order",
    socketSeconds,
    sockets: ["agent", "stt"] as const,
    sessionIds: ["session-a"],
    boundaries: ["one voice, one call"],
    recordedAt: at,
  }
}

function ledgerRuns(path: string) {
  return parseLedger(JSON.parse(readFileSync(path, "utf8"))) ?? []
}

describe("AU7: make spend reads the same runs the live registry records", () => {
  it("reconciles every RunRecord written through the registry with its ledger entry", () => {
    const { registry, ledger } = scratch()
    appendRunRecord(record("2026-09-25T10:00:00.000Z"), registry, ledger)
    appendRunRecord(record("2026-09-25T11:00:00.000Z", 37.5), registry, ledger)
    const result = reconcileRegistry(readRegistry(registry).runs, ledgerRuns(ledger))
    expect(result).toMatchObject({ registryRuns: 2, matched: 2 })
    expect(reconciles(result)).toBe(true)
  })

  it("names a registry run the ledger does not hold, because the spend would understate it", () => {
    const { registry, ledger } = scratch()
    appendRunRecord(record("2026-09-25T10:00:00.000Z"), registry, ledger)
    const result = reconcileRegistry(readRegistry(registry).runs, [])
    expect(result.missingFromLedger).toEqual([readRegistry(registry).runs[0]?.runId])
    expect(reconciles(result)).toBe(false)
  })

  it("flags a ledger entry whose socket time differs from the registry's", () => {
    const { registry, ledger } = scratch()
    appendRunRecord(record("2026-09-25T10:00:00.000Z"), registry, ledger)
    const altered = ledgerRuns(ledger).map((run) => ({
      ...run,
      openSeconds: run.openSeconds + 5,
    }))
    const result = reconcileRegistry(readRegistry(registry).runs, altered)
    expect(result.disagreements.join("\n")).toContain("socket time")
    expect(result.disagreements.join("\n")).toContain("USD")
  })

  it("accepts the full RunRecord shape and refuses one missing its kind, reason or session ids", () => {
    const { registry, ledger } = scratch()
    const written = appendRunRecord(record("2026-09-25T10:00:00.000Z"), registry, ledger)
    expect(isRunRecord(written)).toBe(true)
    expect(isRunRecord({ ...written, kind: "rehearsal" })).toBe(false)
    const { reason: _reason, ...withoutReason } = written
    expect(isRunRecord(withoutReason)).toBe(false)
    expect(isRunRecord({ ...written, sessionIds: "session-a" })).toBe(false)
  })

  it("the spend report prints the reconciliation against the committed registry", () => {
    const output = execFileSync("npx", ["tsx", "scripts/report/spend-report.ts"], {
      encoding: "utf8",
      stdio: "pipe",
      shell: true,
    })
    const registryRuns = readRegistry().runs.length
    expect(output).toContain(`live run registry: ${registryRuns} runs, ${registryRuns} found`)
  })
})
