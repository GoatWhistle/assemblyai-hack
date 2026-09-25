import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { LEVEL_INTERVAL_MS, LEVEL_STEPS, levelThrottle } from "@/features/intake/level-throttle"

describe("AU12: the microphone level does not re-render the call screen at audio rate", () => {
  it("passes at most one level per interval, however often the worklet reports", () => {
    let clock = 0
    const seen: number[] = []
    const report = levelThrottle(
      (level) => seen.push(level),
      () => clock,
    )
    for (let frame = 0; frame < 47; frame += 1) {
      clock = frame * (1000 / 47)
      report(0.5)
    }
    expect(
      seen.length,
      "47 worklet frames a second would re-render every panel 47 times a second",
    ).toBeLessThanOrEqual(Math.ceil(1000 / LEVEL_INTERVAL_MS))
    expect(seen.length).toBeGreaterThan(0)
  })

  it("rounds to a fixed step so an unchanged level lets React skip the render", () => {
    const seen: number[] = []
    const report = levelThrottle(
      (level) => seen.push(level),
      () => 0,
    )
    report(0.51234)
    expect(seen).toEqual([Math.round(0.51234 * LEVEL_STEPS) / LEVEL_STEPS])
  })

  it("never reports a level outside 0 to 1", () => {
    let clock = 0
    const seen: number[] = []
    const report = levelThrottle(
      (level) => seen.push(level),
      () => clock,
    )
    report(1.7)
    clock += LEVEL_INTERVAL_MS
    report(-0.2)
    expect(seen).toEqual([1, 0])
  })

  it("is the path the live session actually takes", () => {
    expect(readFileSync("src/features/intake/use-session.ts", "utf8")).toContain(
      "onLevel: levelThrottle(setLevel)",
    )
  })
})
