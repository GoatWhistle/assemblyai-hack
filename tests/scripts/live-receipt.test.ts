import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { readRegistry } from "../../scripts/live/run-registry"
import {
  ACCEPTANCE_BOUNDARIES,
  deploymentBoundary,
  LIVE_SMOKE_BOUNDARY,
  parseReceiptArgs,
  type ReceiptArgs,
  type ReceiptDeps,
  recordReceipt,
} from "../../scripts/live-receipt"

const BASE = [
  "--deployment",
  "https://preview.example.com",
  "--session",
  "s-1",
  "--outcome",
  "completed",
  "--reason",
  "live smoke clean order",
  "--agent-seconds",
  "40",
  "--stt-seconds",
  "40",
]

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function sandbox(fetchImpl: typeof fetch): ReceiptDeps & { fetched: string[] } {
  const dir = mkdtempSync(join(tmpdir(), "live-receipt-"))
  dirs.push(dir)
  const registry = join(dir, "runs.json")
  const ledger = join(dir, "ledger.json")
  writeFileSync(registry, JSON.stringify({ runs: [] }), "utf8")
  copyFileSync("eval/spend-ledger.json", ledger)
  const fetched: string[] = []
  return {
    fetched,
    outDir: join(dir, "live"),
    registry,
    ledger,
    now: () => new Date("2026-09-25T12:00:00.000Z"),
    fetch: async (input, init) => {
      fetched.push(String(input))
      return await fetchImpl(input, init)
    },
  }
}

function parsed(argv: readonly string[]): ReceiptArgs {
  const args = parseReceiptArgs(argv)
  if (typeof args === "string") {
    throw new Error(args)
  }
  return args
}

describe("live-receipt records a live smoke as what it is", () => {
  it("keeps the acceptance-call defaults when no kind or command is given", () => {
    const args = parsed(BASE)
    expect(args.kind).toBe("acceptance_call")
    expect(args.command).toBe("npx tsx scripts/live-receipt.ts")
  })

  it("accepts --kind live_smoke and --command, and refuses an unknown kind", () => {
    const args = parsed([...BASE, "--kind", "live_smoke", "--command", "make live-smoke"])
    expect(args.kind).toBe("live_smoke")
    expect(args.command).toBe("make live-smoke")
    expect(parseReceiptArgs([...BASE, "--kind", "human_call"])).toMatch(/is not one of/)
    expect(parseReceiptArgs([...BASE.slice(0, 4)])).toMatch(/^usage:/)
  })

  it("writes kind, command and the synthesised-caller boundary into the registry", async () => {
    const deps = sandbox(async () => new Response("{}", { status: 404 }))
    const { record, out } = await recordReceipt(
      parsed([...BASE, "--kind", "live_smoke", "--command", "make live-smoke"]),
      deps,
    )
    expect(record.kind).toBe("live_smoke")
    expect(record.command).toBe("make live-smoke")
    expect(record.boundaries).toContain(LIVE_SMOKE_BOUNDARY)
    expect(
      record.boundaries,
      "a smoke run must not claim it was one call by a member of the team",
    ).not.toContain(ACCEPTANCE_BOUNDARIES[0])
    expect(readRegistry(deps.registry).runs.map((run) => run.kind)).toEqual(["live_smoke"])
    const artefact = JSON.parse(readFileSync(out, "utf8")) as {
      kind: string
      boundaries: string[]
    }
    expect(artefact.kind).toBe("live_smoke")
    expect(artefact.boundaries).toContain(LIVE_SMOKE_BOUNDARY)
    expect(out).toMatch(/live-smoke-2026-09-25T12-00-00-000Z\.json$/)
  })

  it("records an unbound session as a failed run without fetching, even when the harness said completed", async () => {
    const deps = sandbox(async () => {
      throw new Error("must not be called")
    })
    const args = parsed([
      ...BASE.map((value) => (value === "s-1" ? "unbound-order-clean-1758801600000" : value)),
      "--kind",
      "live_smoke",
    ])
    const { record } = await recordReceipt(args, deps)
    expect(deps.fetched).toEqual([])
    expect(record.outcome).toBe("failed")
    expect(record.reason).toMatch(/never bound a server session/)
    expect(record.sessionIds).toEqual(["unbound-order-clean-1758801600000"])
  })

  it("records a run whose receipt fetch throws instead of crashing, and names the failure", async () => {
    const deps = sandbox(async () => {
      throw new TypeError("fetch failed")
    })
    const { record } = await recordReceipt(parsed([...BASE, "--kind", "live_smoke"]), deps)
    expect(record.outcome).toBe("completed")
    expect(record.reason).toMatch(/receipt could not be fetched: fetch failed/)
    expect(deps.fetched).toEqual(["https://preview.example.com/api/sessions/s-1/receipt"])
  })

  it("keeps the acceptance-call boundaries for a human call", async () => {
    const deps = sandbox(async () => new Response("{}", { status: 404 }))
    const { record } = await recordReceipt(parsed(BASE), deps)
    expect(record.kind).toBe("acceptance_call")
    expect(record.boundaries).toEqual([
      ...ACCEPTANCE_BOUNDARIES,
      deploymentBoundary("https://preview.example.com"),
    ])
    expect(record.reason).toMatch(/answered 404/)
  })

  it("does not call a production deployment a preview", () => {
    expect(deploymentBoundary("https://readback-rx.vercel.app")).not.toMatch(/preview/)
    expect(deploymentBoundary("https://readback-rx.vercel.app")).toContain(
      "readback-rx.vercel.app",
    )
    expect(deploymentBoundary("https://readback-git-main-team.vercel.app")).toMatch(/preview/)
    expect(deploymentBoundary("https://abc.ngrok-free.app")).toMatch(/preview/)
  })
})
