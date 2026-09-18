import { describe, expect, it } from "vitest"
import { admitAgainstRateBrake, freshRateBrakeState, RATE_BRAKE_HONESTY_NOTE } from "@/domain"

describe("the instance rate brake, named honestly as a probability reducer and not a cap", () => {
  it("admits requests up to the configured ceiling within one window", () => {
    const state = freshRateBrakeState()
    for (let i = 1; i <= 5; i += 1) {
      const outcome = admitAgainstRateBrake({
        state,
        nowMs: 1_000,
        maxPerWindow: 5,
        windowMs: 60_000,
      })
      expect(outcome.allowed, `request ${i} of 5 must be admitted`).toBe(true)
      expect(outcome.countInWindow).toBe(i)
    }
  })

  it("refuses the request that would exceed the ceiling inside the same window", () => {
    const state = freshRateBrakeState()
    for (let i = 0; i < 5; i += 1) {
      admitAgainstRateBrake({ state, nowMs: 1_000, maxPerWindow: 5, windowMs: 60_000 })
    }
    const sixth = admitAgainstRateBrake({
      state,
      nowMs: 1_100,
      maxPerWindow: 5,
      windowMs: 60_000,
    })
    expect(sixth.allowed, "the sixth request in the same 60s window must be refused").toBe(
      false,
    )
    expect(sixth.retryAfterMs).toBeGreaterThan(0)
  })

  it("resets the window once the configured duration has elapsed, so the brake is per-window not lifetime", () => {
    const state = freshRateBrakeState()
    for (let i = 0; i < 5; i += 1) {
      admitAgainstRateBrake({ state, nowMs: 1_000, maxPerWindow: 5, windowMs: 60_000 })
    }
    const afterWindow = admitAgainstRateBrake({
      state,
      nowMs: 1_000 + 60_000,
      maxPerWindow: 5,
      windowMs: 60_000,
    })
    expect(
      afterWindow.allowed,
      "a request arriving after the window elapsed starts a fresh window rather than staying blocked forever",
    ).toBe(true)
    expect(afterWindow.countInWindow).toBe(1)
  })

  it("treats a clock that moved backwards as a new window rather than throwing or staying stuck", () => {
    const state = freshRateBrakeState()
    admitAgainstRateBrake({ state, nowMs: 10_000, maxPerWindow: 5, windowMs: 60_000 })
    const outcome = admitAgainstRateBrake({
      state,
      nowMs: 5_000,
      maxPerWindow: 5,
      windowMs: 60_000,
    })
    expect(outcome.allowed, "clock skew must not permanently wedge the brake shut").toBe(true)
  })

  it("documents in its own exported string that this reduces probability rather than enforcing a cap", () => {
    expect(RATE_BRAKE_HONESTY_NOTE).toMatch(/does not enforce a global cap/)
    expect(RATE_BRAKE_HONESTY_NOTE).toMatch(/one warm serverless instance/)
  })
})
