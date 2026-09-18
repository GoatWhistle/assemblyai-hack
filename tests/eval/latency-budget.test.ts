import { describe, expect, it } from "vitest"
import {
  breachesTheBuild,
  countExceedances,
  exceedanceVerdict,
  LATENCY_BUDGET_GATING,
  LATENCY_BUDGET_MS,
  LATENCY_BUDGET_ORIGIN,
  LATENCY_BUDGET_RATIONALE,
  type LatencyMetric,
  withinBudget,
} from "@/domain"
import { allExceedances, samplesFor } from "../../scripts/measure/latency-budget"

const METRICS = Object.keys(LATENCY_BUDGET_MS) as readonly LatencyMetric[]

describe("a latency budget lives in config as a number and exceedances are counted against it", () => {
  it("gives every metric a budget, an origin and a written reason, so a number cannot appear without a justification", () => {
    for (const metric of METRICS) {
      expect(
        LATENCY_BUDGET_MS[metric],
        `${metric} has no positive budget; a budget of zero or nothing would make every observation an exceedance or none`,
      ).toBeGreaterThan(0)
      expect(
        LATENCY_BUDGET_RATIONALE[metric]?.length ?? 0,
        `${metric} carries a budget with no recorded reason. A threshold with no reason is indistinguishable from one chosen to make the table look good`,
      ).toBeGreaterThan(60)
      expect(
        LATENCY_BUDGET_ORIGIN[metric],
        `${metric} must say whether its number came from the vendor or from this deployment, because the two carry very different weight`,
      ).toMatch(/vendor published|deployment default/)
    }
  })

  it("adopts the vendor's own published figure for finalization rather than a looser one of our own", () => {
    expect(
      LATENCY_BUDGET_MS.finalization,
      "AssemblyAI publishes P95 under 500 ms; raising this number would turn the guard into a formality that our measured 268 ms could never fail",
    ).toBe(500)
    expect(
      LATENCY_BUDGET_ORIGIN.finalization,
      "the finalization bar is the vendor's, and labelling it as ours would claim a standard we did not set",
    ).toBe("vendor published")
  })

  it("gates the build only on a budget whose number came from outside this project", () => {
    expect(
      LATENCY_BUDGET_GATING.socketOpen,
      "the socket-open ceiling was chosen after seeing our own recorded runs, so failing the build on it would be failing against a line we drew around the data we already have",
    ).toBe(false)
    expect(
      LATENCY_BUDGET_GATING.finalization,
      "the one budget we did not choose must be the one that can fail the build, or the whole table is advisory",
    ).toBe(true)
  })

  it("counts an exceedance rather than only reporting a percentile, and lists the offending values", () => {
    const exceedance = countExceedances("finalization", [100, 600, 700, 200])
    expect(
      exceedance.overBudget,
      "two of those four samples are over 500 ms; a counter that reported anything else is not counting",
    ).toBe(2)
    expect(
      exceedance.overBudgetValuesMs,
      "the offending values must be printed worst first, because a count alone does not tell a reader how badly the budget was missed",
    ).toEqual([700, 600])
    expect(exceedance.worstMs, "the worst case is what a reader asks for next").toBe(700)
  })

  it("treats an empty sample as unmeasured rather than as a metric within budget", () => {
    const empty = countExceedances("finalization", [])
    expect(
      withinBudget(empty),
      "zero observations passing the budget is the absence-as-success defect: a metric nobody measured must never read as a metric that held",
    ).toBe(false)
    expect(
      exceedanceVerdict(empty),
      "the verdict text must say plainly that nothing was observed",
    ).toMatch(/no observation was recorded/)
    expect(
      breachesTheBuild(empty),
      "an unmeasured gating metric must break the build, because otherwise deleting the data is the easiest way to go green",
    ).toBe(true)
  })

  it("reads real samples from the recorded runs, so the budget guards measurements and not an empty list", () => {
    for (const metric of METRICS) {
      expect(
        samplesFor(metric).length,
        `${metric} produced no sample from the committed runs; the budget would then be guarding nothing while printing a table`,
      ).toBeGreaterThan(0)
    }
  })

  it("holds every gating budget on the runs recorded today", () => {
    const breached = allExceedances().filter(breachesTheBuild)
    expect(
      breached.map((entry) => `${entry.metric}: ${entry.overBudget} of ${entry.observations}`),
      "a gating budget exceeded on the committed data means either the recognizer regressed or the budget is wrong, and either way the figure published in eval/REPORT.md no longer holds",
    ).toEqual([])
  })

  it("records that the socket-open ceiling is exceeded by nothing yet still counted, so the non-gating row is not decoration", () => {
    const socketOpen = allExceedances().find((entry) => entry.metric === "socketOpen")
    expect(
      socketOpen?.observations ?? 0,
      "the non-gating metric must still be measured and printed; a budget nobody counts against is exactly the claim this task replaces",
    ).toBeGreaterThan(50)
  })
})
