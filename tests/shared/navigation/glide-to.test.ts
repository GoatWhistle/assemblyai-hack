import { describe, expect, it } from "vitest"
import {
  easeInOutCubic,
  GLIDE_MAX_MS,
  GLIDE_MIN_MS,
  glideDuration,
} from "@/shared/ui/navigation/docs-shell/glide-to"

describe("a table-of-contents jump glides instead of snapping", () => {
  it("takes longer for a longer distance, within a floor and a ceiling", () => {
    expect(glideDuration(0)).toBe(GLIDE_MIN_MS)
    expect(glideDuration(1200)).toBeGreaterThan(glideDuration(600))
    expect(glideDuration(-1200)).toBe(glideDuration(1200))
    expect(glideDuration(100000)).toBe(GLIDE_MAX_MS)
  })

  it("starts and ends gently, so the page never lurches", () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1)
    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)
  })
})
