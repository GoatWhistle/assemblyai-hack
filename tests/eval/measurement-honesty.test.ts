import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseLedger } from "@/domain"
import { resultFileName } from "../../scripts/measure/measure-eer"
import {
  artefactRuns,
  DISCARDED_RUNS,
  honestCount,
  LEDGER_PATH,
} from "../../scripts/report/live-run-count"

function runScript(path: string): { code: number; output: string } {
  try {
    return {
      code: 0,
      output: execFileSync("npx", ["tsx", path], {
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

describe("reproducibility is recorded rather than overwritten", () => {
  it("names a distinct file per repeat, so a second run cannot destroy the first", () => {
    expect(
      resultFileName(false, 1),
      "the first run keeps the name every existing artefact and command already uses",
    ).toBe("result-plain.json")
    expect(
      resultFileName(false, 2),
      "a second run must land in its own file; writing over the first would destroy the only evidence of how far a figure moves between runs, which is the measurement itself",
    ).toBe("result-plain-run2.json")
    expect(resultFileName(true, 2)).toBe("result-keyterms-run2.json")
  })

  it("refuses to overwrite a recorded run, and refuses before spending any credit", () => {
    const source = readFileSync("scripts/measure/measure-eer.ts", "utf8")
    const guardAt = source.indexOf("already holds a recorded run")
    const keyAt = source.indexOf("const key = requireKey()")
    const socketAt = source.indexOf("await transcribeAll(")
    expect(
      guardAt,
      "the refusal must exist in the script and not only in a document nobody runs",
    ).toBeGreaterThan(-1)
    expect(
      guardAt,
      "the overwrite check must come before the key is demanded, or a run refuses only after the operator has been asked for a credential it will not use",
    ).toBeLessThan(keyAt)
    expect(
      guardAt,
      "and it must come before the first socket is opened, or the refusal arrives after the money is spent",
    ).toBeLessThan(socketAt)
  })

  it("states in eval/REPORT.md that reproducibility is not measured, rather than claiming agreement", () => {
    const report = readFileSync("eval/REPORT.md", "utf8")
    expect(
      report,
      "no set has been run twice, and the section must say so in words. A reproducibility section that goes quiet reads as a figure nobody objected to",
    ).toMatch(/not measured/)
    expect(
      report,
      "the honest status has to name what would produce the figure, or the gap is mysterious rather than actionable",
    ).toMatch(/make eval-repeat/)
    expect(
      report,
      "one run cannot disagree with itself, and the reason the figure is absent belongs beside the absence",
    ).toMatch(/discrepancy, not the agreement/)
  })
})

describe("the count of live runs includes the ones that failed", () => {
  it("counts sessions from the artefacts each run left, over a real population", () => {
    const runs = artefactRuns()
    expect(
      runs.length,
      "if the artefact walk returned nothing this whole count would be a confident zero derived from a broken path",
    ).toBeGreaterThan(3)
    expect(
      honestCount(runs).sessions,
      "every recorded session is a paid socket; a total under the number of items in the committed sets would mean runs are being missed",
    ).toBeGreaterThan(150)
  })

  it("counts the discarded rate-limited run, which cost money and produced no usable figure", () => {
    const discarded = DISCARDED_RUNS.reduce((sum, run) => sum + run.sessions, 0)
    expect(
      discarded,
      "the 52.5% pass was thrown away but still billed; omitting it would make the honest count a count of successful runs, which is the number this task exists to replace",
    ).toBeGreaterThan(0)
    const limited = DISCARDED_RUNS.reduce((sum, run) => sum + run.rateLimited, 0)
    expect(
      limited,
      "21 of those sessions closed 1008 against the rate limiter, and a session that closed badly was still opened",
    ).toBe(21)
  })

  it("does not impute a cost to runs whose duration nobody recorded", () => {
    const total = honestCount([...artefactRuns(), ...DISCARDED_RUNS])
    expect(
      total.sessionsWithUnknownDuration,
      "some runs have no socket clock on record, and pretending otherwise is what turns an estimate into a fabrication",
    ).toBeGreaterThan(0)
    const result = runScript("scripts/report/live-run-count.ts")
    expect(result.code, "the published command must run and exit zero").toBe(0)
    expect(
      result.output,
      "the derived figure must be labelled a floor, because sessions with no recorded duration can only push it up",
    ).toMatch(/floor and not the bill/)
  })

  it("reconciles against the ledger and names the gap rather than back-filling it", () => {
    const ledger = parseLedger(JSON.parse(readFileSync(LEDGER_PATH, "utf8")))
    expect(
      ledger,
      "a ledger that does not parse must fail loudly rather than reconcile to zero",
    ).not.toBeNull()
    const counted = honestCount([...artefactRuns(), ...DISCARDED_RUNS]).runs
    if ((ledger ?? []).length < counted) {
      const result = runScript("scripts/report/live-run-count.ts")
      expect(
        result.output,
        "the ledger was added after these runs happened, and inventing entries with guessed durations would be worse than publishing the gap",
      ).toMatch(/ledger is behind by/)
    }
  })
})
