import { execFile } from "node:child_process"
import { readFileSync } from "node:fs"
import { promisify } from "node:util"
import BenchmarkPage from "@app/(pages)/(docs)/metrics/benchmark/page"
import OperationsPage from "@app/(pages)/(docs)/metrics/operations/page"
import MetricsPage from "@app/(pages)/(docs)/metrics/page"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { closeCodeRows, VENDOR_DOCUMENTS_NONE } from "@/features/metrics/close-code-tally"
import { confidenceFigures } from "@/features/metrics/measured-figures"
import {
  abCatch,
  COVERAGE_MATRIX_SCRIPT,
  HELD_OUT_EER_SCRIPT,
  HELD_OUT_ENTRIES,
  HELD_OUT_GENUINE_ABOVE_THRESHOLD,
  HELD_OUT_MEASURED_ON,
  HELD_OUT_STRATA_SCRIPT,
  READ_BACK_COST,
} from "@/features/metrics/report-figures"

const REPORT = readFileSync("eval/REPORT.md", "utf8")
const SLOW = 180_000
const run = promisify(execFile)
const printed = new Map<string, string>()

async function produce(command: string): Promise<string> {
  const [bin, ...args] = command.split(" ")
  const { stdout } = await run(bin ?? "npx", args, {
    encoding: "utf8",
    shell: true,
    timeout: SLOW,
    maxBuffer: 64 * 1024 * 1024,
  })
  return stdout
}

beforeAll(async () => {
  const commands = [COVERAGE_MATRIX_SCRIPT, HELD_OUT_EER_SCRIPT, HELD_OUT_STRATA_SCRIPT]
  const outputs = await Promise.all(commands.map(produce))
  for (const [index, command] of commands.entries()) {
    printed.set(command, outputs[index] ?? "")
  }
}, SLOW)

afterEach(() => {
  cleanup()
})

describe("every figure the docs add is the one its command prints and the report publishes", () => {
  it("r1-A5-02: the seconds a contrastive question costs come from the coverage matrix", () => {
    const output = printed.get(COVERAGE_MATRIX_SCRIPT) ?? ""
    for (const figure of [
      `${READ_BACK_COST.plainWords} on average`,
      `about ${READ_BACK_COST.plainSeconds}`,
      `${READ_BACK_COST.contrastiveWords} on average`,
      `about ${READ_BACK_COST.contrastiveSeconds}`,
      `${READ_BACK_COST.extraSeconds} more`,
      `${READ_BACK_COST.wordsPerSecond.replace(" words", "")} words/s`,
    ]) {
      expect(output, figure).toContain(figure)
    }
    for (const figure of [
      READ_BACK_COST.plainWords,
      READ_BACK_COST.contrastiveWords,
      `about ${READ_BACK_COST.contrastiveSeconds}`,
      `${READ_BACK_COST.extraSeconds} more`,
      READ_BACK_COST.wordsPerSecond,
    ]) {
      expect(REPORT, figure).toContain(figure)
    }
  })

  it("r1-A5-04: every held-out row is printed by its own command and published by the report", () => {
    for (const entry of HELD_OUT_ENTRIES) {
      const value = String(entry.row.value)
      expect(printed.get(entry.row.command) ?? "", `${entry.row.figure}: ${value}`).toContain(
        value,
      )
      expect(REPORT, value).toContain(value)
    }
    const result = JSON.parse(readFileSync("eval/heldout/result-plain.json", "utf8")) as {
      readonly measuredAt: string
      readonly scored: readonly unknown[]
    }
    expect(result.measuredAt.slice(0, 10)).toBe(HELD_OUT_MEASURED_ON)
    expect(HELD_OUT_ENTRIES[0]?.row.n).toBe(result.scored.length)
    for (const name of HELD_OUT_GENUINE_ABOVE_THRESHOLD) {
      expect(REPORT).toContain(`\`${name}\``)
    }
  })

  it("r1-A5-21: the independent run quoted on the benchmark page is the report's", () => {
    const { container } = render(<BenchmarkPage />)
    for (const figure of ["0.408 and 0.385", "0.882"]) {
      expect(container.textContent).toContain(figure)
      expect(REPORT).toContain(figure)
    }
  })
})

describe("r1-A5-01: the measurements page leads with the catch beside the cost", () => {
  it("renders the ab-gate pair and the confident-error count, each with its command", () => {
    const { container } = render(<MetricsPage />)
    const catchPanel = container.querySelector("#headline [data-headline='catch']")
    const ab = abCatch()
    expect(catchPanel?.querySelector("[data-figure='without']")?.textContent).toBe(
      ab?.without.value,
    )
    expect(catchPanel?.querySelector("[data-figure='with']")?.textContent).toBe(ab?.with.value)
    const confident = confidenceFigures().find((entry) => entry.id === "errors-above-threshold")
    const cataloguePanel = container.querySelector("#headline [data-headline='catalogue']")
    expect(
      catchPanel?.querySelector("[data-figure='confident']"),
      "r2-A5 N2: the pair rule caught none of the recorded errors, so their count sits under the catalogue check",
    ).toBe(null)
    expect(cataloguePanel?.querySelector("[data-figure='confident']")?.textContent).toBe(
      confident?.value,
    )
    expect(catchPanel?.textContent).toContain(ab?.with.command)
    expect(cataloguePanel?.textContent).toContain(confident?.command)
    const cost = container.querySelector("#headline [data-headline='cost']")
    expect(cost?.textContent).toContain(READ_BACK_COST.extraSeconds)
    expect(cost?.textContent, "the not-timed caveat travels with the seconds").toMatch(
      /agent's own voice has not been timed/,
    )
  })

  it("publishes the failed hypothesis as a negative result", () => {
    render(<MetricsPage />)
    expect(screen.getByText(/pre-registered hypothesis did not replicate/)).toBeDefined()
  })
})

describe("r1-A5-08: close codes read as observations, never as specification", () => {
  it("says the vendor documents none and names a source for every counted code", () => {
    const { container } = render(<OperationsPage />)
    expect(container.textContent).toContain(VENDOR_DOCUMENTS_NONE)
    for (const row of closeCodeRows()) {
      expect(row.source.length, `${row.code}`).toBeGreaterThan(0)
    }
  })

  it("lists 3006 among the alert-worthy codes, as CLAUDE.md does", () => {
    const { container } = render(<OperationsPage />)
    expect(container.textContent).toMatch(/1008, 3006, 3008 and 3009 are alert-worthy/)
  })

  it("prints the command beside the session count", () => {
    const { container } = render(<OperationsPage />)
    expect(container.textContent).toContain("npx tsx scripts/eer/report.ts eval/<set>")
    expect(container.textContent).toMatch(
      /npx tsx scripts\/report\/live-run-count\.ts\s*n = \d+, sessions of \d+ runs made before the spend ledger existed/,
    )
    expect(container.textContent).toMatch(
      /npx tsx scripts\/measure\/analyse-stress\.ts\s*n = \d+, sessions of the stress run/,
    )
  })
})
