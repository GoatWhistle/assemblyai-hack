import { execFile } from "node:child_process"
import { readFileSync } from "node:fs"
import { promisify } from "node:util"
import DocsOverviewPage from "@app/(pages)/(docs)/docs/page"
import HowItWorksPage from "@app/(pages)/(docs)/how-it-works/page"
import OperationsPage from "@app/(pages)/(docs)/metrics/operations/page"
import MetricsPage from "@app/(pages)/(docs)/metrics/page"
import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { headlineTitle } from "@/features/metrics/catch-cost-headline"
import { closeCodeRows, closeCodeScope } from "@/features/metrics/close-code-tally"
import { confidenceFigures, falseAskTally } from "@/features/metrics/measured-figures"
import {
  abCatch,
  COVERAGE_MATRIX_SCRIPT,
  HELD_OUT_EER_SCRIPT,
  HELD_OUT_GENUINE_ABOVE_THRESHOLD,
  HELD_OUT_REPLICATION,
  HELD_OUT_TYPOS,
} from "@/features/metrics/report-figures"
import {
  LIVE_RUN_COUNT_COMMAND,
  REPORT_ACCOUNT_RUNS,
  STRESS_COMMAND,
} from "@/features/metrics/session-runs"
import { DISCARDED_RUNS } from "../../../scripts/report/live-run-count"

const REPORT = readFileSync("eval/REPORT.md", "utf8")
const SLOW = 180_000
const run = promisify(execFile)
const printed = new Map<string, string>()

beforeAll(async () => {
  const commands = [
    COVERAGE_MATRIX_SCRIPT,
    HELD_OUT_EER_SCRIPT,
    LIVE_RUN_COUNT_COMMAND,
    STRESS_COMMAND,
  ]
  const outputs = await Promise.all(
    commands.map(async (command) => {
      const [bin, ...args] = command.split(" ")
      const { stdout } = await run(bin ?? "npx", args, {
        encoding: "utf8",
        shell: true,
        timeout: SLOW,
        maxBuffer: 64 * 1024 * 1024,
      })
      return stdout
    }),
  )
  for (const [index, command] of commands.entries()) {
    printed.set(command, outputs[index] ?? "")
  }
}, SLOW)

afterEach(() => {
  cleanup()
})

function rowFor(code: number) {
  const row = closeCodeRows().find((entry) => entry.code === code)
  expect(row, `${code} is counted`).toBeDefined()
  return row ?? { beforeLedger: -1, stress: -1, count: -1 }
}

describe("r2-A5 N3: the close-code tally is the whole count, not a subset", () => {
  it("agrees with the honest run count for every run made before the ledger", () => {
    const output = printed.get(LIVE_RUN_COUNT_COMMAND) ?? ""
    const scope = closeCodeScope()
    expect(output).toContain(
      `total paid runs counted here, all made before the spend ledger existed: ${scope.beforeLedgerRuns}`,
    )
    expect(output).toContain(`total paid sessions opened: ${scope.beforeLedgerSessions}`)
    expect(output).toContain(`sessions that closed 1000: ${rowFor(1000).beforeLedger}`)
    expect(output).toContain(
      `sessions the rate limiter closed with 1008, billed regardless: ${rowFor(1008).beforeLedger}`,
    )
  })

  it("counts the two runs without a file exactly as the script does", () => {
    expect(REPORT_ACCOUNT_RUNS.map((entry) => entry.sessions)).toEqual(
      DISCARDED_RUNS.map((entry) => entry.sessions),
    )
    expect(REPORT_ACCOUNT_RUNS.map((entry) => entry.codes.get(1008) ?? 0)).toEqual(
      DISCARDED_RUNS.map((entry) => entry.rateLimited),
    )
  })

  it("agrees with the stress analysis and with the report's close-code table", () => {
    const output = printed.get(STRESS_COMMAND) ?? ""
    expect(output).toContain(`${closeCodeScope().stressSessions} utterances`)
    expect(output).toMatch(/closed 1006/)
    expect(output).toMatch(/closed 1008/)
    expect(rowFor(1006).stress).toBe(1)
    expect(rowFor(1008).stress).toBe(1)
    expect(REPORT).toContain(`${rowFor(1000).beforeLedger} over all 7 runs`)
    expect(REPORT).toContain(`${rowFor(1000).stress} more in the 25 September stress run`)
    expect(REPORT).toContain(
      `| 1008 | rate limiter, billed regardless | ${rowFor(1008).count}:`,
    )
  })

  it("renders the 1008 and 1006 counts beside their commands", () => {
    const { container } = render(<OperationsPage />)
    const table = container.querySelector("[aria-label='Socket close codes']")
    expect(table?.textContent).toContain(LIVE_RUN_COUNT_COMMAND)
    expect(table?.textContent).toContain(STRESS_COMMAND)
    const cells = [...(table?.querySelectorAll("td") ?? [])].map((cell) => cell.textContent)
    expect(cells).toContain(String(rowFor(1008).count))
    expect(cells).toContain(String(rowFor(1008).beforeLedger))
  })
})

describe("r2-A5 N1 and N2: each mechanism gets exactly its own number", () => {
  it("credits the pair rule with its own share of correct names, not the whole gate's", () => {
    const tally = falseAskTally()
    const title = headlineTitle(abCatch(), tally)
    expect(title).toContain(`${tally?.byPairRule} of ${tally?.of}`)
    expect(title).not.toMatch(/asks about every correct name/)
    for (const Page of [MetricsPage, DocsOverviewPage]) {
      const { container } = render(<Page />)
      for (const heading of container.querySelectorAll("h2")) {
        expect(heading.textContent).not.toMatch(/pair rule.*asks about every correct name/i)
      }
      cleanup()
    }
  })

  it("puts the recorded errors under the catalogue check, which the matrix credits with all of them", () => {
    const output = printed.get(COVERAGE_MATRIX_SCRIPT) ?? ""
    const catalogue = confidenceFigures().find((entry) => entry.id === "catalogue-coverage")
    const n = catalogue?.n ?? 0
    expect(output).toContain(`| catalogue absence | ${n}/${n} |`)
    expect(output).toContain(`| pair rule, contrastive read-back | 0/${n} |`)
    const { container } = render(<MetricsPage />)
    const panel = container.querySelector("[data-headline='catalogue']")
    expect(panel?.querySelector("[data-figure='catalogue']")?.textContent).toBe(
      catalogue?.value,
    )
  })

  it("keeps the compact headline on /docs and links to the full one", () => {
    const { container } = render(<DocsOverviewPage />)
    expect(container.querySelector("[data-headline='catalogue']")).toBe(null)
    expect(container.querySelector("a[href='/metrics#headline']")).not.toBe(null)
  })
})

describe("r2-A5 N4: what replicated on the held-out set", () => {
  it("names the overall rate and both typo items, as the eer report prints them", () => {
    const output = printed.get(HELD_OUT_EER_SCRIPT) ?? ""
    const misheard = output.split("\n").filter((line) => line.includes(" -> "))
    expect(misheard).toHaveLength(HELD_OUT_REPLICATION.errors)
    const above = misheard.filter((line) => {
      const confidence = Number(/confidence ([0-9.]+)/.exec(line)?.[1] ?? "0")
      return confidence >= 0.95
    })
    expect(above).toHaveLength(HELD_OUT_REPLICATION.aboveThreshold)
    for (const name of [...HELD_OUT_TYPOS, ...HELD_OUT_GENUINE_ABOVE_THRESHOLD]) {
      expect(
        above.some((line) => line.startsWith(`  ${name} ->`)),
        name,
      ).toBe(true)
    }
    expect(output).toContain(HELD_OUT_REPLICATION.heldOutRate)
    expect(REPORT).toContain(`**EER ${HELD_OUT_REPLICATION.withoutTyposRate}**`)
    expect(REPORT).toContain(`over ${HELD_OUT_REPLICATION.withoutTyposN} utterances`)
    expect(REPORT).toContain(
      `against ${HELD_OUT_REPLICATION.controlRate} on the control corpus`,
    )
  })

  it("says the overall rate replicated, not the two genuine errors", () => {
    const { container } = render(<MetricsPage />)
    expect(container.textContent).toContain("What replicated is the overall error rate")
    expect(container.textContent).toContain(HELD_OUT_REPLICATION.withoutTyposRate)
  })
})

describe("r2-A5 N5: the Joint Commission line carries the project's verified-location caveat", () => {
  it("carries the verified-location caveat verbatim", () => {
    const clause =
      "(NPSG.02.01.01; ISMP places it at PC.02.01.03 EP 20 in 2017; its 2026 location is not verified)"
    const { container } = render(<HowItWorksPage />)
    expect(container.textContent?.replace(/\s+/g, " ")).toContain(clause)
  })
})
