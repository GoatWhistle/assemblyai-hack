const Z = 1.959964

export type Interval = {
  readonly point: number
  readonly low: number
  readonly high: number
  readonly n: number
  readonly successes: number
}

export function wilson(successes: number, n: number): Interval {
  if (n === 0) {
    return { point: 0, low: 0, high: 0, n: 0, successes: 0 }
  }
  const p = successes / n
  const z2 = Z * Z
  const denominator = 1 + z2 / n
  const centre = (p + z2 / (2 * n)) / denominator
  const spread = (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominator
  return {
    point: p,
    low: Math.max(0, centre - spread),
    high: Math.min(1, centre + spread),
    n,
    successes,
  }
}

export function formatInterval(interval: Interval): string {
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`
  return `${pct(interval.point)} [${pct(interval.low)}, ${pct(interval.high)}]`
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.low <= b.high && b.low <= a.high
}
