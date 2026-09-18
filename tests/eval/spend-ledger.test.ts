import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  costOfRun,
  type PaidRun,
  parseLedger,
  RATE_USD_PER_HOUR,
  RATES_CHECKED_ON,
  ratePerHourFor,
  totalSpend,
} from "@/domain"
import { appendPaidRun, paidRunOf } from "../../scripts/report/record-spend"

const LEDGER_PATH = "eval/spend-ledger.json"

function run(overrides: Partial<PaidRun> = {}): PaidRun {
  return {
    runId: "r1",
    at: "2026-09-17T00:00:00.000Z",
    command: "scripts/report/probe-stt.ts",
    sockets: ["stt"],
    openSeconds: 3600,
    outcome: "completed",
    ...overrides,
  }
}

function runReport(): { code: number; output: string } {
  try {
    return {
      code: 0,
      output: execFileSync("npx", ["tsx", "scripts/report/spend-report.ts"], {
        encoding: "utf8",
        stdio: "pipe",
        shell: true,
      }),
    }
  } catch (error) {
    const shaped = error as { status?: number; stdout?: string; stderr?: string }
    return { code: shaped.status ?? -1, output: `${shaped.stdout ?? ""}${shaped.stderr ?? ""}` }
  }
}

describe("the spend figure is derived from recorded runs, never from a remembered price", () => {
  it("sums the rate only over the sockets a run actually opened, so one socket does not pay another's rate", () => {
    expect(
      ratePerHourFor(["stt"]),
      "a streaming-only probe must not be charged the agent rate",
    ).toBe(0.45)
    expect(
      ratePerHourFor(["agent", "stt", "medical"]),
      "a full session opens both sockets with medical mode, and the published combined figure of 5.10 must fall out of the table rather than be typed in",
    ).toBe(5.1)
  })

  it("never double counts a socket listed twice in one run", () => {
    expect(
      ratePerHourFor(["stt", "stt"]),
      "a duplicated socket entry must not double the bill, or a transcription slip becomes a fabricated cost",
    ).toBe(0.45)
  })

  it("computes one hour of streaming as exactly the published hourly rate, anchoring the arithmetic to the price table", () => {
    expect(
      costOfRun(run({ openSeconds: 3600 })).usd,
      "if an hour of one socket does not cost its hourly rate, every other figure in the report is wrong too",
    ).toBe(RATE_USD_PER_HOUR.stt)
  })

  it("bills a run that failed, because AssemblyAI charges for socket lifetime and not for success", () => {
    const total = totalSpend([run({ outcome: "failed" })])
    expect(
      total.usd,
      "an honest count of what was spent includes the runs that did not work; excluding them is how a spend figure drifts below reality",
    ).toBeGreaterThan(0)
    expect(
      total.failedRunCount,
      "the count of non-completing runs must be published beside the total, per the honest-count requirement",
    ).toBe(1)
  })

  it("refuses a ledger whose runs are malformed rather than treating it as an empty ledger worth zero", () => {
    expect(
      parseLedger({ runs: [{ runId: "r1" }] }),
      "a half-written entry reading as zero spend is exactly the absence-as-success defect this project has found repeatedly",
    ).toBeNull()
    expect(parseLedger({}), "a ledger with no runs array is malformed, not empty").toBeNull()
    expect(
      parseLedger({ runs: [] }),
      "a genuinely empty runs array is valid and distinct from a malformed one",
    ).toEqual([])
  })

  it("refuses a negative duration, which would let one entry cancel out another run's real cost", () => {
    expect(
      parseLedger({ runs: [run({ openSeconds: -60 })] }),
      "a negative open time is not a cheaper run, it is a corrupt record, and allowing it would let the total be edited downward",
    ).toBeNull()
  })

  it("refuses a socket name that is not in the rate table, so a typo cannot be silently priced at zero", () => {
    expect(
      parseLedger({ runs: [{ ...run(), sockets: ["gpu"] }] }),
      "an unknown socket kind has no published rate; pricing it at zero would understate the bill while looking complete",
    ).toBeNull()
  })

  it("refuses to append a duplicate run id instead of overwriting the earlier run", () => {
    const dir = mkdtempSync(join(tmpdir(), "spend-"))
    const path = join(dir, "ledger.json")
    try {
      writeFileSync(path, JSON.stringify({ runs: [] }), "utf8")
      appendPaidRun(run({ runId: "same" }), path)
      expect(
        () => appendPaidRun(run({ runId: "same" }), path),
        "overwriting a run with a repeated id would hide a paid run from the total",
      ).toThrow(/already recorded/)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it("refuses to append into a malformed ledger rather than rewriting it as a fresh one holding a single run", () => {
    const dir = mkdtempSync(join(tmpdir(), "spend-"))
    const path = join(dir, "ledger.json")
    try {
      writeFileSync(path, JSON.stringify({ runs: [{ broken: true }] }), "utf8")
      expect(
        () => appendPaidRun(run(), path),
        "silently replacing a ledger it could not read would destroy the history that makes the total checkable",
      ).toThrow(/does not parse/)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it("derives a run's duration from recorded open and close timestamps rather than from a typed-in number", () => {
    const recorded = paidRunOf({
      command: "scripts/report/probe-stt.ts",
      sockets: ["stt"],
      openedAtMs: 1_000_000,
      closedAtMs: 1_006_000,
      outcome: "completed",
    })
    expect(
      recorded.openSeconds,
      "the ledger's duration must come from the socket's own clock, which is what makes the derived cost evidence rather than an assertion",
    ).toBe(6)
  })

  it("ships a ledger file that parses, so the published command cannot fail on the committed data", () => {
    const parsed = parseLedger(JSON.parse(readFileSync(LEDGER_PATH, "utf8")))
    expect(
      parsed,
      `${LEDGER_PATH} must parse as a ledger or the report command is broken`,
    ).not.toBeNull()
  })

  it("prints the rate table, the date it was checked and the command that produced the report", () => {
    const result = runReport()
    expect(result.code, "the published command must actually run and exit zero").toBe(0)
    expect(
      result.output,
      "a rate with no check date is a remembered price, which is the thing this task exists to replace",
    ).toContain(RATES_CHECKED_ON)
    expect(
      result.output,
      "every figure must carry the command that produced it, per the project's own rule",
    ).toContain("npx tsx scripts/report/spend-report.ts")
    expect(result.output).toContain("assemblyai.com/pricing")
  })

  it("withholds a total when no run is recorded instead of publishing a confident zero", () => {
    const result = runReport()
    const runs = parseLedger(JSON.parse(readFileSync(LEDGER_PATH, "utf8"))) ?? []
    if (runs.length > 0) {
      expect(result.output, "a populated ledger must print its derived total").toContain(
        "derived total",
      )
      return
    }
    expect(
      result.output,
      "printing a total of zero from an empty ledger would claim a measurement nobody made; the honest output says the figure is withheld",
    ).not.toContain("derived total")
    expect(result.output).toMatch(/publishes no spend figure/)
  })

  it("labels the derived figure an estimate and names the one number a human verified", () => {
    const result = runReport()
    expect(
      result.output,
      "calling our own arithmetic an invoice would be the kind of unverifiable money claim this task replaces",
    ).toMatch(/not an invoice/)
    expect(
      result.output,
      "the account balance is the only vendor-verifiable figure and must be labelled as human-read on a named date",
    ).toMatch(/149\.93/)
  })

  it("leaves no hardcoded hourly rate in the paid probe, so one price table governs every figure", () => {
    const source = readFileSync("scripts/report/probe-stt.ts", "utf8")
    expect(
      source,
      "a literal 0.45 in a script is a second price list that drifts from the checked one, which is exactly how a project ends up publishing two different numbers",
    ).not.toMatch(/0\.45/)
    expect(source, "the probe must price itself from the shared rate table").toContain(
      "ratePerHourFor",
    )
  })
})
