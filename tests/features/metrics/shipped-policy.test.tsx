import DocsOverviewPage from "@app/(pages)/(docs)/docs/page"
import BenchmarkPage from "@app/(pages)/(docs)/metrics/benchmark/page"
import OperationsPage from "@app/(pages)/(docs)/metrics/operations/page"
import MetricsPage from "@app/(pages)/(docs)/metrics/page"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { falseAskTally } from "@/features/metrics/measured-figures"
import {
  SHIPPED_POLICY_COMMANDS,
  shippedPolicyEntries,
} from "@/features/metrics/policy-figures"
import { BENCHMARK_ROWS } from "@/stats"

afterEach(() => {
  cleanup()
})

const STALE_WORDING = [/16 times/, /27\.1%/, /40\.0%/, /charged to/i, /pure cost/i]

function serverRow(figure: RegExp) {
  const found = BENCHMARK_ROWS.find((row) => figure.test(row.figure))
  if (found === undefined) {
    throw new Error(`BENCHMARK_ROWS has no row matching ${figure}`)
  }
  return found
}

function percentOf(part: number, whole: number): string {
  return `${((part / whole) * 100).toFixed(1)}%`
}

describe("the shipped-policy table is the server's rows, verbatim", () => {
  it("takes every row the three shipped-policy commands produce, and nothing else", () => {
    const expected = BENCHMARK_ROWS.filter((row) =>
      SHIPPED_POLICY_COMMANDS.includes(row.command),
    )
    expect(expected.length).toBeGreaterThan(0)
    expect(shippedPolicyEntries().map((entry) => entry.row)).toEqual(expected)
  })

  it("renders each row's value and command as published", () => {
    const { container } = render(<MetricsPage />)
    for (const entry of shippedPolicyEntries()) {
      const row = container.querySelector(`tr[data-row="${entry.id}"]`)
      expect(row, entry.row.figure).not.toBeNull()
      expect(row?.querySelector('[data-column="value"]')?.textContent).toBe(entry.row.value)
      expect(row?.querySelector('[data-column="command"]')?.textContent).toBe(entry.row.command)
    }
  })

  it("renders no stale threshold-only wording anywhere on the measurement pages", () => {
    const pages = [
      <MetricsPage key="metrics" />,
      <BenchmarkPage key="benchmark" />,
      <OperationsPage key="operations" />,
      <DocsOverviewPage key="overview" />,
    ]
    for (const page of pages) {
      const { container, unmount } = render(page)
      const text = container.textContent ?? ""
      for (const stale of STALE_WORDING) {
        expect(stale.test(text), `${stale} is still on ${page.key}`).toBe(false)
      }
      unmount()
    }
  })
})

describe("the headline counts what the server publishes", () => {
  const tally = falseAskTally()

  it("asks about the same number of correct drug names as the server row", () => {
    const row = serverRow(/correct drug names the shipped gate asks about/)
    expect(`${tally?.asked}/${tally?.of}`).toBe(row.value)
    expect(tally?.of).toBe(row.n)
  })

  it("gives the contrastive question to the same share as the server row", () => {
    const row = serverRow(/contrastive question under the full ISMP list/)
    expect(tally).not.toBeNull()
    const point = percentOf(tally?.byPairRule ?? 0, tally?.of ?? 1)
    expect(row.value?.startsWith(`${point} [`), `${row.value} against ${point}`).toBe(true)
  })

  it("splits every ask into exactly one of the three mechanisms", () => {
    expect(
      (tally?.byStandingReadBack ?? 0) + (tally?.byThreshold ?? 0) + (tally?.byPairRule ?? 0),
    ).toBe(tally?.of)
  })
})
