import { describe, expect, it } from "vitest"
import { createPlayback } from "@/audio/playback"
import { createReplyClock } from "@/audio/reply-clock"
import { AGENT_SAMPLE_RATE } from "@/audio/resample"

function fakeContext() {
  const context = {
    currentTime: 0,
    destination: {},
    createBuffer: (_channels: number, length: number) => {
      const data = new Float32Array(length)
      return { getChannelData: () => data }
    },
    createBufferSource: () => ({
      buffer: null,
      onended: null,
      connect: () => undefined,
      start: () => undefined,
      stop: () => undefined,
    }),
    close: async () => undefined,
  }
  return context
}

function frameOfSeconds(seconds: number): string {
  return Buffer.from(new Uint8Array(Math.round(seconds * AGENT_SAMPLE_RATE) * 2)).toString(
    "base64",
  )
}

describe("the reply clock measures what the speaker actually played", () => {
  it("counts only the part of each scheduled chunk that the clock has passed", () => {
    const clock = createReplyClock()
    clock.begin()
    clock.schedule(0, 1)
    clock.schedule(1, 1)
    expect(clock.measure(1.5)).toEqual({ playedMs: 1500, durationMs: 2000 })
  })

  it("freezes played time at the moment of a stop", () => {
    const clock = createReplyClock()
    clock.begin()
    clock.schedule(0, 2)
    clock.stopAt(0.4)
    expect(clock.measure(5)).toEqual({ playedMs: 400, durationMs: 2000 })
  })

  it("ignores gaps between chunks instead of counting silence as speech", () => {
    const clock = createReplyClock()
    clock.begin()
    clock.schedule(0, 0.5)
    clock.schedule(2, 0.5)
    expect(clock.measure(3)).toEqual({ playedMs: 1000, durationMs: 1000 })
  })
})

describe("playback settles a reply on the playback clock", () => {
  it("reports a flushed reply as played less than its duration", async () => {
    const context = fakeContext()
    const playback = createPlayback(context as unknown as AudioContext)
    playback.beginReply()
    playback.enqueue(frameOfSeconds(1))
    playback.enqueue(frameOfSeconds(1))
    context.currentTime = 0.6
    const settled = playback.settleReply()
    playback.flush()
    await expect(settled).resolves.toEqual({ playedMs: 600, durationMs: 2000 })
  })

  it("reports a reply played to its end as fully played", async () => {
    const context = fakeContext()
    const playback = createPlayback(context as unknown as AudioContext)
    playback.beginReply()
    playback.enqueue(frameOfSeconds(0.5))
    context.currentTime = 0.5
    await expect(playback.settleReply()).resolves.toEqual({ playedMs: 500, durationMs: 500 })
  })
})
