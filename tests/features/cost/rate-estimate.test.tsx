import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  ABSENCE_NOTE,
  CLAIM_WORDS,
  DENIAL_MARKERS,
  DRIFT_NOTE,
  ESTIMATE_TITLE,
  METHOD_LINE,
  NOT_A_BILL,
  READING_LABEL,
  WHY_COMBINED,
} from "@/features/cost/estimate-language"
import {
  COMBINED_PER_HOUR_USD,
  COMBINED_PER_MINUTE_USD,
  estimateFromElapsed,
  formatUsd,
  PUBLISHED_RATES,
  RATE_CHECKED_ON,
  RATE_SOURCE_URL,
} from "@/features/cost/published-rate"
import { RateEstimate } from "@/features/cost/rate-estimate"

const GUARDRAILS = readFileSync("docs/cost-guardrails.md", "utf8")

describe("the rate the counter multiplies by is the published one, not a remembered number", () => {
  it("takes every rate from the price table in docs/cost-guardrails.md", () => {
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

describe("elapsed time becomes an estimate, and no elapsed time becomes no figure", () => {
  it("publishes no figure at all before a socket has been open", () => {
    expect(
      estimateFromElapsed(0),
      "make spend refuses to print a zero with no run recorded because a zero is a number nobody measured; the on-screen counter holds the same line",
    ).toBeNull()
  })

  it("refuses a negative or non-finite elapsed time rather than inventing a figure", () => {
    expect(
      estimateFromElapsed(-1000),
      "a negative clock reading is a defect, and multiplying it by a rate would publish a negative estimate",
    ).toBeNull()
    expect(
      estimateFromElapsed(Number.NaN),
      "a NaN elapsed time would render as a NaN estimate rather than as absence",
    ).toBeNull()
  })

  it("multiplies one full hour by exactly the combined rate", () => {
    const estimate = estimateFromElapsed(3600000)
    expect(estimate, "an hour of elapsed time must produce an estimate").not.toBeNull()
    expect(
      estimate?.usd,
      "one hour at the combined rate is $5.10; any other figure means the multiplication is not the published rate",
    ).toBeCloseTo(5.1, 10)
  })

  it("multiplies one minute by the combined per-minute rate", () => {
    const estimate = estimateFromElapsed(60000)
    expect(
      estimate?.usd,
      "one minute at $5.10/hr is $0.085, the figure the guardrails document names",
    ).toBeCloseTo(0.085, 10)
  })

  it("keeps sub-cent estimates readable rather than rounding them to zero", () => {
    expect(
      formatUsd(0.0042),
      "a forty-second demo costs less than a cent; rounding it to $0.00 republishes the zero that absence was meant to avoid",
    ).toBe("$0.0042")
  })
})

describe("the counter reads as an estimate at a published rate and never as a bill", () => {
  it("names itself an estimate and denies being a bill in the same breath", () => {
    render(<RateEstimate estimate={estimateFromElapsed(60000)} />)
    expect(
      screen.getByText(ESTIMATE_TITLE),
      "the title carries the qualification, so the figure is never read alone",
    ).toBeTruthy()
    expect(
      screen.getByText(NOT_A_BILL),
      "without the denial, a dollar figure beside a live timer reads as money owed",
    ).toBeTruthy()
  })

  it("carries the denial wording in the language module rather than only in prose", () => {
    const lowered = NOT_A_BILL.toLowerCase()
    for (const marker of DENIAL_MARKERS) {
      expect(
        lowered,
        `the phrase "${marker}" is what makes the label a qualification rather than a hedge; losing it turns the figure into an unsourced claim about money`,
      ).toContain(marker)
    }
  })

  it("does not assert a charge anywhere a viewer reads the figure", () => {
    const labels = [ESTIMATE_TITLE, READING_LABEL, ABSENCE_NOTE, METHOD_LINE, WHY_COMBINED]
    for (const label of labels) {
      for (const claim of CLAIM_WORDS) {
        expect(
          label.toLowerCase(),
          `"${claim}" in "${label}" states what AssemblyAI did, and we have no billing API that could support that`,
        ).not.toContain(claim)
      }
    }
  })

  it("prints the method and the set the figure was derived from beside it", () => {
    render(<RateEstimate estimate={estimateFromElapsed(120000)} />)
    expect(
      screen.getByText(METHOD_LINE),
      "numbers without a method are forbidden, and the method here is elapsed time times a dated published rate",
    ).toBeTruthy()
    expect(
      screen.getByText(DRIFT_NOTE),
      "a dated rate is only checkable if the screen says the page wins when the two disagree",
    ).toBeTruthy()
  })

  it("explains why the combined rate rather than one socket's rate is used", () => {
    render(<RateEstimate estimate={estimateFromElapsed(60000)} />)
    expect(
      screen.getByText(WHY_COMBINED),
      "a judge seeing three rates needs to know they apply at once, or the sum looks like padding",
    ).toBeTruthy()
  })

  it("shows absence as absence before any socket has been open", () => {
    render(<RateEstimate estimate={null} />)
    expect(
      screen.getByText(ABSENCE_NOTE),
      "a zero would claim a session ran and cost nothing, which is the failure make spend exists to avoid",
    ).toBeTruthy()
    expect(
      screen.queryByText("$0.0000"),
      "an unmeasured session must not render as a measured zero",
    ).toBeNull()
  })

  it("renders the figure derived from the elapsed time it was handed", () => {
    render(<RateEstimate estimate={estimateFromElapsed(60000)} />)
    expect(
      screen.getByText(formatUsd(0.085)),
      "one minute of session at the published combined rate is the figure the screen must show",
    ).toBeTruthy()
  })

  it("links the price page rather than asking the reader to trust the number", () => {
    render(<RateEstimate estimate={estimateFromElapsed(60000)} />)
    const link = screen.getByRole("link", {
      name: "the price page these three rates come from",
    })
    expect(
      link.getAttribute("href"),
      "the rate is checkable only if the page it was read off is reachable from the screen",
    ).toBe(RATE_SOURCE_URL)
  })
})

describe("the estimate ships on the live screen, not merely in its own tests", () => {
  it("is rendered by the intake screen from the elapsed time it already tracks", () => {
    const screenSource = readFileSync("src/features/intake/intake-screen/index.tsx", "utf8")
    expect(
      screenSource,
      "a cost counter nobody renders shows a judge nothing, which is the dead-read-back defect one indirection away",
    ).toContain("RateEstimate")
    expect(
      screenSource,
      "the estimate has to be derived from the live elapsed clock rather than from a constant",
    ).toContain("estimateFromElapsed(elapsedMs)")
  })
})
