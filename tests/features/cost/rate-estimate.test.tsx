import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  COMBINED_PER_HOUR_USD,
  COMBINED_PER_MINUTE_USD,
  PUBLISHED_RATES,
  RATE_CHECKED_ON,
  RATE_SOURCE_URL,
} from "@/features/cost/published-rate"

const GUARDRAILS = readFileSync("docs/cost-and-budget.md", "utf8")

describe("the rate the counter multiplies by is the published one, not a remembered number", () => {
  it("takes every rate from the price table in docs/cost-and-budget.md", () => {
    for (const rate of PUBLISHED_RATES) {
      expect(
        GUARDRAILS,
        `${rate.product} at ${rate.perHourUsd}/hr does not appear in the cost guardrails document; a rate that exists only in a component is exactly the unsourced figure this project forbids`,
      ).toContain(`$${rate.perHourUsd.toFixed(2)}/hr`)
    }
  })

  it("sums all three sockets rather than showing the recognizer alone", () => {
    expect(
      COMBINED_PER_HOUR_USD,
      "two sockets bill simultaneously; showing only the $0.45/hr streaming rate understates a session by an order of magnitude",
    ).toBeCloseTo(5.1, 10)
    expect(
      PUBLISHED_RATES.length,
      "the agent socket, the recognizer socket and the medical surcharge are three separate published lines and all three apply at once",
    ).toBe(3)
  })

  it("derives the per-minute figure rather than hardcoding a second copy of it", () => {
    expect(
      COMBINED_PER_MINUTE_USD,
      "a per-minute constant written by hand can drift away from the per-hour one it is supposed to equal",
    ).toBeCloseTo(0.085, 10)
  })

  it("publishes the date the rate was checked, as a date the guardrails document agrees with", () => {
    expect(
      RATE_CHECKED_ON,
      "a rate with no check date cannot be told apart from a stale one",
    ).toBe("2026-09-17")
    expect(
      GUARDRAILS,
      "the check date on screen has to be the one the document records, or the two disagree silently",
    ).toContain("17.09.2026")
    expect(RATE_SOURCE_URL, "the number needs the page it came from, not just a date").toBe(
      "https://www.assemblyai.com/pricing",
    )
  })
})
