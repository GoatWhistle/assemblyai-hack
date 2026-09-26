import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createReplyWatchdog, REPLY_STALL_MS } from "@/features/intake/session-timers"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("the reply watchdog measures silence, not the length of a reply", () => {
  it("lets a long contrastive question that keeps streaming audio run past the stall window", () => {
    const onStall = vi.fn()
    const watchdog = createReplyWatchdog(onStall)
    watchdog.replyStarted()
    for (let second = 0; second < 30; second += 1) {
      vi.advanceTimersByTime(1000)
      watchdog.replyProgress()
    }
    expect(onStall).not.toHaveBeenCalled()
    watchdog.replyDone()
    vi.advanceTimersByTime(REPLY_STALL_MS * 2)
    expect(onStall).not.toHaveBeenCalled()
  })

  it("still reopens the microphone when a reply goes silent without finishing", () => {
    const onStall = vi.fn()
    const watchdog = createReplyWatchdog(onStall)
    watchdog.replyStarted()
    vi.advanceTimersByTime(5000)
    watchdog.replyProgress()
    vi.advanceTimersByTime(REPLY_STALL_MS)
    expect(onStall).toHaveBeenCalledTimes(1)
  })

  it("does not start a stall window from audio that arrives outside a reply", () => {
    const onStall = vi.fn()
    const watchdog = createReplyWatchdog(onStall)
    watchdog.replyProgress()
    vi.advanceTimersByTime(REPLY_STALL_MS * 2)
    expect(onStall).not.toHaveBeenCalled()
  })
})
