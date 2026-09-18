import { describe, expect, it } from "vitest"
import {
  BAND_READING_RULE,
  band,
  formatBand,
  isPointMisleading,
  sideOfThreshold,
  widthShare,
  wilson,
} from "@/stats"

describe("a figure is published as a band, and the only stable claim is which side of the threshold it falls on", () => {
  it("states the reading rule in words, so a reader is told the point estimate will not reproduce", () => {
    expect(
      BAND_READING_RULE,
      "the rule has to say that another run gives different numbers; an interval printed without it still invites a reader to quote the midpoint",
    ).toMatch(/different numbers/)
    expect(
      BAND_READING_RULE,
      "and it has to say what does survive a re-run, otherwise it reads as a disclaimer that nothing is known",
    ).toMatch(/which side of the threshold/)
  })

  it("calls an interval that clears the line wholly above it, and one that does not straddling", () => {
    expect(
      sideOfThreshold(wilson(40, 50), 0.1),
      "80% on n=50 has a lower bound far above 10%, so the side is a claim the data supports",
    ).toBe("wholly above")
    expect(
      sideOfThreshold(wilson(1, 200), 0.1),
      "0.5% on n=200 keeps its whole interval under 10%; the same 1-in-50 does not, and that difference is exactly what the band is for",
    ).toBe("wholly below")
    expect(
      sideOfThreshold(wilson(1, 50), 0.1),
      "one error in fifty looks decisively under a 10% line as a point estimate, yet its Wilson upper bound is 10.5%, so the side is not established. This is the case that makes the whole presentation worth having",
    ).toBe("straddles")
    expect(
      sideOfThreshold(wilson(5, 50), 0.1),
      "10% on n=50 has an interval spanning the line itself, and claiming a side there would be claiming more than was measured",
    ).toBe("straddles")
  })

  it("refuses to call a straddling figure stable, which is the whole point of the presentation", () => {
    const straddling = band(5, 50, 0.1)
    expect(
      straddling.stable,
      "a point estimate landing exactly on the threshold reads as a decided result; the band exists so that it does not",
    ).toBe(false)
    expect(
      formatBand(straddling),
      "the rendered figure must name the side explicitly rather than leaving a reader to compare the numbers themselves",
    ).toMatch(/straddles/)
  })

  it("publishes nothing from an empty set rather than a zero with a tight interval", () => {
    const nothing = band(0, 0, 0.1)
    expect(
      formatBand(nothing),
      "wilson on n=0 returns zeroes, and rendering that as 0.0% [0.0%, 0.0%] would be the most confident figure in the report while resting on nothing",
    ).toMatch(/no observation/)
    expect(nothing.stable, "a figure from no data cannot be stable").toBe(false)
  })

  it("reports the width of the interval, which is what tells a reader how much of the figure is noise", () => {
    const narrow = widthShare(wilson(500, 5000))
    const wide = widthShare(wilson(5, 50))
    expect(
      wide,
      "a smaller sample must produce a visibly wider band, or the width carries no information",
    ).toBeGreaterThan(narrow)
    expect(
      isPointMisleading(wilson(5, 50), 0.1),
      "an interval more than ten percentage points wide must be flagged, because quoting its midpoint as a result is how a noisy figure becomes a claim",
    ).toBe(true)
  })

  it("reproduces the published false-ask band from the recorded corpus, so the report's figure is derived and not typed", () => {
    const falseAsk = band(16, 59, 0.1)
    expect(
      (falseAsk.interval.point * 100).toFixed(1),
      "eval/REPORT.md publishes 27.1% over 59 correct values; if this arithmetic disagrees, one of the two is stale",
    ).toBe("27.1")
    expect((falseAsk.interval.low * 100).toFixed(1)).toBe("17.4")
    expect(
      (falseAsk.interval.high * 100).toFixed(1),
      "the upper bound is the number the honest-intake margin is taken from, so it must match the published one exactly",
    ).toBe("39.6")
  })
})
