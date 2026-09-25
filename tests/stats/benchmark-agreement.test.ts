import { existsSync, readFileSync } from "node:fs"
import { GET as metricsRoute } from "@app/api/metrics/route"
import { describe, expect, it } from "vitest"
import { createMemoryStore, installSessionStore } from "@/sessions"
import { BENCHMARK_ROWS, BUSINESS_READING } from "@/stats"
import { STEPS } from "../../scripts/report/honest"

const REPORT = readFileSync("eval/REPORT.md", "utf8")

const HONEST_COMMANDS = new Set(STEPS.map((step) => step.command))

describe("U9: every figure on /metrics is anchored to the report and to a re-runnable command", () => {
  it("shows every measured value exactly as eval/REPORT.md publishes it", () => {
    for (const row of BENCHMARK_ROWS.filter((entry) => entry.value !== null)) {
      expect(REPORT.includes(String(row.value)), `${row.figure}: ${row.value}`).toBe(true)
    }
  })

  it("names a command make honest re-runs for every measured value", () => {
    for (const row of BENCHMARK_ROWS.filter((entry) => entry.value !== null)) {
      expect(HONEST_COMMANDS.has(row.command), `${row.figure}: ${row.command}`).toBe(true)
      expect(row.n, row.figure).not.toBeNull()
      expect(row.measuredOn, row.figure).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it("renders an unmeasured figure as null with no n, never as zero", () => {
    const unmeasured = BENCHMARK_ROWS.filter((entry) => entry.value === null)
    expect(unmeasured.length).toBeGreaterThan(0)
    for (const row of unmeasured) {
      expect(row.n, row.figure).toBeNull()
      expect(row.measuredOn, row.figure).toBeNull()
    }
  })

  it("points each unmeasured live figure at a command that exists or says not measured", () => {
    for (const row of BENCHMARK_ROWS.filter((entry) => entry.value === null)) {
      const script = row.command.match(/scripts\/\S+\.ts/)?.[0]
      const known =
        row.command === "not measured" ||
        row.command.startsWith("make ") ||
        (script !== undefined && existsSync(script))
      expect(known, row.command).toBe(true)
    }
  })

  it("V5: publishes a business reading only where a measured figure backs it", () => {
    for (const reading of BUSINESS_READING) {
      if (reading.value !== null) {
        expect(HONEST_COMMANDS.has(reading.derivedFrom), reading.reading).toBe(true)
      } else {
        expect(reading.caveat.length).toBeGreaterThan(0)
      }
    }
  })

  it("serves the rows through GET /api/metrics", async () => {
    installSessionStore(createMemoryStore())
    const body = await (await metricsRoute()).json()
    expect(body.benchmark).toEqual(JSON.parse(JSON.stringify(BENCHMARK_ROWS)))
    expect(body.businessReading.length).toBe(BUSINESS_READING.length)
  })
})
