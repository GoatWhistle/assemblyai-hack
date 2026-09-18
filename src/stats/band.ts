import { type Interval, wilson } from "./wilson"

export const BAND_READING_RULE =
  "your run will produce different numbers. The only stable thing is which side of the threshold they fall on, so read the interval and the side, never the point"

export type ThresholdSide = "wholly above" | "wholly below" | "straddles"

export type Band = {
  readonly interval: Interval
  readonly thresholdShare: number
  readonly side: ThresholdSide
  readonly stable: boolean
}

export function sideOfThreshold(interval: Interval, thresholdShare: number): ThresholdSide {
  if (interval.n === 0) {
    return "straddles"
  }
  if (interval.low > thresholdShare) {
    return "wholly above"
  }
  if (interval.high < thresholdShare) {
    return "wholly below"
  }
  return "straddles"
}

export function band(successes: number, n: number, thresholdShare: number): Band {
  const interval = wilson(successes, n)
  const side = sideOfThreshold(interval, thresholdShare)
  return { interval, thresholdShare, side, stable: side !== "straddles" }
}

export function formatBand(value: Band): string {
  const pct = (share: number) => `${(share * 100).toFixed(1)}%`
  if (value.interval.n === 0) {
    return "no observation, so no band: an empty set publishes no figure rather than a zero"
  }
  const head = `${pct(value.interval.point)} [${pct(value.interval.low)}, ${pct(value.interval.high)}] at n=${value.interval.n}`
  return `${head}, ${value.side} ${pct(value.thresholdShare)}`
}

export function widthShare(interval: Interval): number {
  return interval.high - interval.low
}

export function isPointMisleading(interval: Interval, toleranceShare: number): boolean {
  return widthShare(interval) > toleranceShare
}
