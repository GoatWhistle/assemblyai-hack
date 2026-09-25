export const LEVEL_INTERVAL_MS = 66
export const LEVEL_STEPS = 24

export function levelThrottle(
  set: (level: number) => void,
  clock: () => number = () => globalThis.performance.now(),
): (peak: number) => void {
  let last = Number.NEGATIVE_INFINITY
  return (peak) => {
    const now = clock()
    if (now - last < LEVEL_INTERVAL_MS) {
      return
    }
    last = now
    const bounded = Math.min(1, Math.max(0, peak))
    set(Math.round(bounded * LEVEL_STEPS) / LEVEL_STEPS)
  }
}
